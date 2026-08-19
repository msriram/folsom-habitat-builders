-- Idempotent homework reminder queue. Delivery is performed by the
-- homework-reminders Edge Function with a server-side email provider.
create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email_reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
drop policy if exists notification_preferences_read_own on public.notification_preferences;
drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_read_own on public.notification_preferences
  for select to authenticated using (profile_id = auth.uid());
create policy notification_preferences_update_own on public.notification_preferences
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create table if not exists public.homework_reminders (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('one_week','two_days')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  team_id uuid references public.teams(id),
  unique (assignment_id, recipient_id, reminder_kind)
);

-- Keep team scope available even if this table was created by an earlier draft.
alter table public.homework_reminders add column if not exists team_id uuid references public.teams(id);
update public.homework_reminders r set team_id = a.team_id from public.assignments a where a.id = r.assignment_id and r.team_id is null;
alter table public.homework_reminders alter column team_id set not null;

alter table public.homework_reminders enable row level security;
drop policy if exists homework_reminders_coach_read on public.homework_reminders;
create policy homework_reminders_coach_read on public.homework_reminders
  for select to authenticated
  using (team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach'));

create or replace function public.queue_homework_reminders()
returns integer
language plpgsql security definer set search_path=public as $$
declare added integer := 0; one_week timestamptz := now() + interval '7 days'; two_days timestamptz := now() + interval '2 days';
begin
  insert into public.homework_reminders (assignment_id,student_id,recipient_id,reminder_kind,scheduled_for,team_id)
  select a.id, p.linked_student_id, p.id, kind.reminder_kind, a.due_at - kind.reminder_offset, a.team_id
  from public.assignments a
  join public.profiles p on p.linked_student_id is not null and p.role in ('parent','coach') and p.team_id=a.team_id and p.approval_status='approved' and p.is_active
  left join public.notification_preferences pref on pref.profile_id=p.id
  cross join (values ('one_week'::text, interval '7 days'), ('two_days'::text, interval '2 days')) kind(reminder_kind, reminder_offset)
  where a.published and a.due_at is not null and coalesce(pref.email_reminders_enabled,true)
    and ((kind.reminder_kind='one_week' and a.due_at between one_week - interval '90 minutes' and one_week + interval '90 minutes')
      or (kind.reminder_kind='two_days' and a.due_at between two_days - interval '90 minutes' and two_days + interval '90 minutes'))
  on conflict (assignment_id,recipient_id,reminder_kind) do nothing;
  get diagnostics added = row_count;
  return added;
end; $$;

revoke all on function public.queue_homework_reminders() from public;
grant execute on function public.queue_homework_reminders() to service_role;
