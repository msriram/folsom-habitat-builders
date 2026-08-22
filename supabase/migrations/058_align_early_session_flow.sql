-- Keep the schedule checklist aligned with the early-season hands-on flow.
delete from public.schedule_items
where team_id in (select id from public.teams where slug = 'folsom-fireflies')
  and session_key in ('meeting-02', 'meeting-03', 'meeting-04');

insert into public.schedule_items(team_id, session_key, week_number, area, label, sort_order)
select t.id, item.session_key, item.week_number, item.area, item.label, item.sort_order
from public.teams t cross join (values
  ('meeting-02', 2, 'Robot', 'Build mission models or assign the next build owner', 1),
  ('meeting-02', 2, 'Robot', 'Record table and robot measurements', 2),
  ('meeting-02', 2, 'Robot', 'Record early robot trial runs and one next change', 3),
  ('meeting-02', 2, 'Teamwork', 'Select the team name', 4),
  ('meeting-02', 2, 'Teamwork', 'Complete the reflection and Core Values exercise', 5),
  ('meeting-03', 3, 'Robot', 'Build, check, and label more mission models', 1),
  ('meeting-03', 3, 'Robot', 'Record or correct useful measurements', 2),
  ('meeting-03', 3, 'Robot', 'Record repeatable robot trial runs and next tests', 3),
  ('meeting-03', 3, 'Teamwork', 'Connect the team name to a BIOGLOW theme', 4),
  ('meeting-04', 4, 'Project', 'Collect credible starting sources for two local biodiversity problems', 1),
  ('meeting-04', 4, 'Project', 'Record existing solutions and their limitations', 2),
  ('meeting-04', 4, 'Project', 'Assign follow-up research questions to a next source or person', 3),
  ('meeting-04', 4, 'Teamwork', 'Keep the project open; do not select a final problem or solution yet', 4)
) as item(session_key, week_number, area, label, sort_order)
where t.slug = 'folsom-fireflies';
