-- The next two meetings are intentionally reserved for the remaining field
-- builds: M8/M9 tree house, M13, M15, and the three bases for M13–M15.
insert into public.schedule_items(team_id, session_key, week_number, area, label, sort_order)
select t.id, item.session_key, item.week_number, item.area, item.label, item.sort_order
from public.teams t
cross join (values
  ('meeting-04', 4, 'Robot', 'Build the M8/M9 large tree house with a 2–3 student crew', 1),
  ('meeting-04', 4, 'Robot', 'Build and place the mission bases for M13, M14, and M15', 2),
  ('meeting-04', 4, 'Robot', 'Check the M8/M9 tree house motion and the three base reset positions', 3),
  ('meeting-04', 4, 'Teamwork', 'Record any remaining M13 or M15 model step and its next build owner', 4),
  ('meeting-05', 5, 'Robot', 'Finish, place, and reset-check Mission 13', 1),
  ('meeting-05', 5, 'Robot', 'Finish, place, and reset-check Mission 15', 2),
  ('meeting-05', 5, 'Robot', 'Complete and check the M13, M14, and M15 bases together', 3),
  ('meeting-05', 5, 'Teamwork', 'Choose one completed model action for the next attachment plan', 4)
) as item(session_key, week_number, area, label, sort_order)
where t.id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
on conflict(team_id, session_key, sort_order) do update
set week_number = excluded.week_number,
    area = excluded.area,
    label = excluded.label;
