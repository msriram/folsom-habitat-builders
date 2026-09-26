-- Session 6 moved from September 25 to October 2. Keep the calendar, access
-- release logic, and homework deadlines in the live team records consistent.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
begin
  update public.schedule_sessions session
  set session_date = plan.session_date::date
  from (values
    ('meeting-06', '2026-10-02'),
    ('meeting-07', '2026-10-09'),
    ('meeting-08', '2026-10-16'),
    ('meeting-09', '2026-10-23'),
    ('meeting-10', '2026-10-30'),
    ('meeting-11', '2026-11-06'),
    ('meeting-12', '2026-11-13')
  ) as plan(session_key, session_date)
  where session.team_id = target_team_id
    and session.session_key = plan.session_key;

  update public.assignments assignment
  set due_at = plan.due_at::timestamptz
  from (values
    (6, '2026-09-30 23:59:00-07'),
    (7, '2026-10-07 23:59:00-07'),
    (8, '2026-10-14 23:59:00-07'),
    (9, '2026-10-21 23:59:00-07'),
    (10, '2026-10-28 23:59:00-07'),
    (11, '2026-11-04 23:59:00-07'),
    (12, '2026-11-11 23:59:00-07')
  ) as plan(week_number, due_at)
  where assignment.team_id = target_team_id
    and assignment.week_number = plan.week_number;
end $$;
