-- Monday 9:00 AM Pacific reminders go directly to students who still have
-- unfinished published homework. Each Monday is a separate reminder record.
alter table public.homework_reminders
  drop constraint if exists homework_reminders_reminder_kind_check;
alter table public.homework_reminders
  add constraint homework_reminders_reminder_kind_check
  check (reminder_kind in ('one_week','two_days','monday'));

alter table public.homework_reminders
  drop constraint if exists homework_reminders_assignment_id_recipient_id_reminder_kind_key;
create unique index if not exists homework_reminders_monday_delivery_key
  on public.homework_reminders (assignment_id, recipient_id, reminder_kind, scheduled_for);

create or replace function public.queue_homework_reminders()
returns integer
language plpgsql security definer set search_path=public as $$
declare
  added integer := 0;
  local_now timestamp := now() at time zone 'America/Los_Angeles';
  monday_start timestamp := date_trunc('day', local_now) - ((extract(isodow from local_now)::integer - 1) * interval '1 day');
  next_monday timestamptz := ((monday_start + interval '9 hours') at time zone 'America/Los_Angeles');
begin
  if local_now >= monday_start + interval '9 hours' then
    next_monday := ((monday_start + interval '7 days 9 hours') at time zone 'America/Los_Angeles');
  end if;

  insert into public.homework_reminders
    (assignment_id, student_id, recipient_id, reminder_kind, scheduled_for, team_id)
  select a.id, p.id, p.id, 'monday', next_monday, a.team_id
  from public.assignments a
  join public.profiles p on p.team_id = a.team_id
    and p.role = 'student'
    and p.approval_status = 'approved'
    and p.is_active
    and p.email is not null
  left join public.notification_preferences pref on pref.profile_id = p.id
  where a.published
    and a.week_number between 0 and 1
    and a.due_at is not null
    and coalesce(pref.email_reminders_enabled, true)
    and not exists (
      select 1 from public.submissions s
      where s.assignment_id = a.id and s.student_id = p.id
        and s.status in ('submitted','review','complete')
    )
  on conflict (assignment_id, recipient_id, reminder_kind, scheduled_for) do nothing;
  get diagnostics added = row_count;
  return added;
end; $$;

revoke all on function public.queue_homework_reminders() from public;
grant execute on function public.queue_homework_reminders() to service_role;
