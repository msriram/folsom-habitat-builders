-- The coach and Team Room session-focus cards read schedule_items, which is a
-- separate source from the public session pages. Keep Sessions 4-8 on the same
-- design -> build -> test -> record -> decide rhythm without clearing any
-- completion history a coach may already have recorded.
insert into public.schedule_items(team_id, session_key, week_number, area, label, sort_order)
select t.id, item.session_key, item.week_number, item.area, item.label, item.sort_order
from public.teams t
cross join (values
  ('meeting-04', 4, 'Robot', 'Measure the planned route, model contact point, and attachment reach', 1),
  ('meeting-04', 4, 'Robot', 'Build and fit attachment version 1 to the base robot', 2),
  ('meeting-04', 4, 'Robot', 'Record three controlled first trials and the first failure point', 3),
  ('meeting-04', 4, 'Teamwork', 'Choose one evidence-based revision target for Week 5', 4),
  ('meeting-05', 5, 'Robot', 'Build the Week 5 attachment version and check clearances', 1),
  ('meeting-05', 5, 'Robot', 'Run and record five comparable trials from the same home base and reset', 2),
  ('meeting-05', 5, 'Robot', 'Test one controlled adjustment with confirmation tries', 3),
  ('meeting-05', 5, 'Teamwork', 'Keep, revise, or defer the attachment using the test record', 4),
  ('meeting-06', 6, 'Robot', 'Build the planned attachment or code change for one mission action', 1),
  ('meeting-06', 6, 'Robot', 'Check the planned measurements, alignments, or sensor readings', 2),
  ('meeting-06', 6, 'Robot', 'Record five controlled trials and compare them to the previous version', 3),
  ('meeting-06', 6, 'Teamwork', 'Write one specific revision target for Week 7', 4),
  ('meeting-07', 7, 'Robot', 'Build only the planned attachment revision', 1),
  ('meeting-07', 7, 'Robot', 'Run the original version twice as a baseline', 2),
  ('meeting-07', 7, 'Robot', 'Run the revised version five times with the same start and reset', 3),
  ('meeting-07', 7, 'Teamwork', 'Use the decision rule to keep, revise, or defer the revision', 4),
  ('meeting-08', 8, 'Robot', 'Build or refine the attachment for the planned short run', 1),
  ('meeting-08', 8, 'Robot', 'Reset robot, attachment, model, and program the same way before every run', 2),
  ('meeting-08', 8, 'Robot', 'Record ten controlled trials, including time and failure mode', 3),
  ('meeting-08', 8, 'Teamwork', 'Decide from the pattern whether the run is ready, needs revision, or should be simplified', 4)
) as item(session_key, week_number, area, label, sort_order)
where t.id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
on conflict(team_id, session_key, sort_order) do update
set week_number = excluded.week_number,
    area = excluded.area,
    label = excluded.label;
