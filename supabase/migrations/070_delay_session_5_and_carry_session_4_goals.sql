-- Session 5 was missed. Move the remaining calendar forward one week and make
-- the September 18 session the single source of truth for the Session 4
-- carry-over work plus the tree-house and Mission 13–15 model builds.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
begin
  update public.schedule_sessions session
  set session_date = plan.session_date::date
  from (values
    ('meeting-05', '2026-09-18'),
    ('meeting-06', '2026-09-25'),
    ('meeting-07', '2026-10-02'),
    ('meeting-08', '2026-10-09'),
    ('meeting-09', '2026-10-16'),
    ('meeting-10', '2026-10-23'),
    ('meeting-11', '2026-10-30'),
    ('meeting-12', '2026-11-06')
  ) as plan(session_key, session_date)
  where session.team_id = target_team_id
    and session.session_key = plan.session_key;

  update public.assignments assignment
  set due_at = plan.due_at::timestamptz,
      title = case when assignment.week_number = 5 then 'Model build inspiration and project curiosity' else assignment.title end,
      description = case when assignment.week_number = 5 then 'Reflect on early attachment tests, bring one useful build idea, and ask a meaningful Innovation Project question before Session 5.' else assignment.description end
  from (values
    (5, '2026-09-16 23:59:00-07'),
    (6, '2026-09-23 23:59:00-07'),
    (7, '2026-09-30 23:59:00-07'),
    (8, '2026-10-07 23:59:00-07'),
    (9, '2026-10-14 23:59:00-07'),
    (10, '2026-10-21 23:59:00-07'),
    (11, '2026-10-28 23:59:00-07'),
    (12, '2026-11-04 23:59:00-07')
  ) as plan(week_number, due_at)
  where assignment.team_id = target_team_id
    and assignment.week_number = plan.week_number;

  delete from public.schedule_items item
  where item.team_id = target_team_id
    and item.session_key = 'meeting-05'
    and item.sort_order > 7
    and not item.completed;
end $$;

insert into public.schedule_items(team_id, session_key, week_number, area, label, sort_order)
select 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'::uuid,
       item.session_key,
       item.week_number,
       item.area,
       item.label,
       item.sort_order
from (values
  ('meeting-05', 5, 'Robot', 'Record the carried-over Mission 1, 3, 5, and 6 trial observations', 1),
  ('meeting-05', 5, 'Robot', 'Record the next reliable step for the partial Mission 1 and Mission 5 runs', 2),
  ('meeting-05', 5, 'Robot', 'Build the M8/M9 large tree house and check its motion', 3),
  ('meeting-05', 5, 'Robot', 'Build, place, and reset-check the Mission 13, 14, and 15 bases', 4),
  ('meeting-05', 5, 'Robot', 'Continue Mission 13 and build or finish Mission 15; check placement and reset', 5),
  ('meeting-05', 5, 'Robot', 'Verify every completed field model can be placed, operated, and reset correctly', 6),
  ('meeting-05', 5, 'Teamwork', 'Record any remaining model step, its owner, and the next robot action to plan', 7)
) as item(session_key, week_number, area, label, sort_order)
on conflict(team_id, session_key, sort_order) do update
set week_number = excluded.week_number,
    area = excluded.area,
    label = excluded.label,
    completed = false,
    completed_by = null,
    completed_at = null;
