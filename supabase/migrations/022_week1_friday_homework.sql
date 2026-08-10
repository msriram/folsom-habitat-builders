-- Friday is the team homework deadline. Sunday remains the project/research meeting.
update public.assignments
set due_at = '2026-08-21 17:00:00-07'
where team_id = (select id from public.teams where slug = 'folsom-fireflies')
  and week_number = 2;

insert into public.assignments(team_id,title,description,due_at,created_by,week_number,published)
select t.id,
  'Build the field and record a robot baseline',
  'Confirm the table and mat setup, measure the base robot, run three baseline tests, and choose a first mission family.',
  '2026-08-14 17:00:00-07',
  p.id, 1, true
from public.teams t
join public.profiles p on p.team_id = t.id and p.role = 'coach' and p.approval_status = 'approved'
where t.slug = 'folsom-fireflies'
order by p.approved_at
limit 1
on conflict (team_id,week_number) where week_number is not null do update
set title = excluded.title, description = excluded.description, due_at = excluded.due_at, published = true;

insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
select a.id,q.key,q.ord,q.prompt,q.kind,q.required
from public.assignments a
cross join (values
  ('field_status',0,'What is ready, missing, or uncertain about the field/table setup?','long_text',true),
  ('baseline',1,'What did your base-robot baseline show?','long_text',true),
  ('first_run',2,'Which first mission family should we test, and why?','long_text',true)
) q(key,ord,prompt,kind,required)
where a.team_id = (select id from public.teams where slug = 'folsom-fireflies')
  and a.week_number = 1
on conflict (assignment_id,question_key) do update
set prompt = excluded.prompt, answer_type = excluded.answer_type, required = excluded.required;
