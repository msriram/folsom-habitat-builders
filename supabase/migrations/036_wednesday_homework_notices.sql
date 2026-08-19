-- Wednesday homework notices: family delivery at 9 PM Pacific and the lead
-- coach digest at 11:15 AM Pacific. Week 0 remains the setup week in storage;
-- emails use the human-facing season week (stored week_number + 1).
alter table public.homework_reminders
  drop constraint if exists homework_reminders_reminder_kind_check;
alter table public.homework_reminders
  add constraint homework_reminders_reminder_kind_check
  check (reminder_kind in ('one_week','two_days','monday','wednesday_family','wednesday_coach'));

create or replace function public.queue_homework_reminders()
returns integer
language plpgsql security definer set search_path=public as $$
declare
  added integer := 0;
  local_now timestamp := now() at time zone 'America/Los_Angeles';
  wednesday_start timestamp := date_trunc('week', local_now) + interval '2 days';
  family_time timestamptz := ((wednesday_start + interval '21 hours') at time zone 'America/Los_Angeles');
  coach_time timestamptz := ((wednesday_start + interval '11 hours 15 minutes') at time zone 'America/Los_Angeles');
begin
  if local_now >= wednesday_start + interval '21 hours' then
    family_time := (((wednesday_start + interval '7 days') + interval '21 hours') at time zone 'America/Los_Angeles');
    coach_time := (((wednesday_start + interval '7 days') + interval '11 hours 15 minutes') at time zone 'America/Los_Angeles');
  elsif local_now >= wednesday_start + interval '11 hours 15 minutes' then
    coach_time := ((wednesday_start + interval '11 hours 15 minutes') at time zone 'America/Los_Angeles');
  end if;

  with current_assignment as (
    select a.* from public.assignments a
    where a.published and a.due_at is not null
      and a.due_at between now() - interval '7 days' and now() + interval '7 days'
    order by case when a.due_at >= now() then 0 else 1 end,
             abs(extract(epoch from (a.due_at - now()))) limit 1
  )
  insert into public.homework_reminders
    (assignment_id, student_id, recipient_id, reminder_kind, scheduled_for, team_id)
  select a.id, p.id, p.id, 'wednesday_family', family_time, a.team_id
  from current_assignment a
  join public.profiles p on p.team_id = a.team_id
    and p.approval_status = 'approved' and p.is_active and p.email is not null
    and ((p.role = 'student') or (p.role in ('parent','coach') and p.linked_student_id is not null))
  left join public.notification_preferences pref on pref.profile_id = p.id
  where coalesce(pref.email_reminders_enabled, true)
  on conflict (assignment_id, recipient_id, reminder_kind, scheduled_for) do nothing;

  with current_assignment as (
    select a.* from public.assignments a
    where a.published and a.due_at is not null
      and a.due_at between now() - interval '7 days' and now() + interval '7 days'
    order by case when a.due_at >= now() then 0 else 1 end,
             abs(extract(epoch from (a.due_at - now()))) limit 1
  )
  insert into public.homework_reminders
    (assignment_id, student_id, recipient_id, reminder_kind, scheduled_for, team_id)
  select a.id, p.id, p.id, 'wednesday_coach', coach_time, a.team_id
  from current_assignment a
  join public.profiles p on lower(p.email) = 'sriram87@gmail.com'
    and p.team_id = a.team_id and p.approval_status = 'approved' and p.is_active
  on conflict (assignment_id, recipient_id, reminder_kind, scheduled_for) do nothing;

  get diagnostics added = row_count;
  return added;
end; $$;

revoke all on function public.queue_homework_reminders() from public;
grant execute on function public.queue_homework_reminders() to service_role;
