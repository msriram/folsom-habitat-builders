-- Session 4 became a model recap and trial-run session. Its unfinished model
-- work has already been copied to Session 5 by the session-completion flow.
-- Keep the one checked record as the partial Mission 13 build, and replace the
-- Session 4 checklist with what the team actually did.
update public.schedule_items
set week_number = 4,
    area = 'Robot',
    label = 'Record trial-run observations for Missions 1, 3, 5, and 6'
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and session_key = 'meeting-04'
  and sort_order = 1;

update public.schedule_items
set week_number = 4,
    area = 'Robot',
    label = 'Begin Mission 13 model build and organize its remaining steps'
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and session_key = 'meeting-04'
  and sort_order = 2;

update public.schedule_items
set week_number = 4,
    area = 'Robot',
    label = 'Record the next reliable step for the partial Mission 1 and Mission 5 runs'
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and session_key = 'meeting-04'
  and sort_order = 3;

update public.schedule_items
set week_number = 4,
    area = 'Teamwork',
    label = 'Record what the team learned from the recap and trial runs'
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and session_key = 'meeting-04'
  and sort_order = 4;

delete from public.schedule_items
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and session_key = 'meeting-04'
  and sort_order in (5, 6)
  and completed = false;
