-- Week 1 is the official Introduction Session plus preparation for Session 1.
update public.assignments
set title = 'Read the BIOGLOW Introduction and prepare for Session 1',
    description = 'Read the official Introduction Session and Session 1 decks, answer the team questions, and bring a build, test, and question to Friday practice.'
where team_id = (select id from public.teams where slug = 'folsom-fireflies')
  and week_number = 1;

insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
select a.id,q.key,q.ord,q.prompt,q.kind,q.required
from public.assignments a
cross join (values
  ('three_parts',0,'What are the three parts of FIRST LEGO League Challenge, and what will we do for each?','long_text',true),
  ('biodiversity_question',1,'What biodiversity problem or question interests you?','long_text',true),
  ('core_value',2,'Which Core Value should guide our first practice, and what behavior will show it?','long_text',true),
  ('session1_plan',3,'What will you build, test, and ask about in Session 1?','long_text',true)
) q(key,ord,prompt,kind,required)
where a.team_id = (select id from public.teams where slug = 'folsom-fireflies')
  and a.week_number = 1
on conflict (assignment_id,question_key) do update
set display_order = excluded.display_order, prompt = excluded.prompt, answer_type = excluded.answer_type, required = excluded.required;
