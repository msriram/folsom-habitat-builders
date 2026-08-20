-- Week 3 remains unpublished. Use the Session 1 notebook reflection question
-- from page 10: connect a mission model to a Project Spark after rewatching
-- the official Robot Game Missions video.
update public.assignment_questions q
set prompt = 'Rewatch the Robot Game Missions video. Choose one mission model and explain in your own words how it works, what it represents, and how it connects to a Project Spark.'
from public.assignments a
where q.assignment_id = a.id
  and a.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number = 3
  and not a.published
  and q.question_key = 'model_purpose';
