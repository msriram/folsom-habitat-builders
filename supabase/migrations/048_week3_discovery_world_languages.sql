-- Week 3 remains unpublished. Its Core Values task follows the third page of
-- the Discovery activity book: explore the worldwide FIRST LEGO League team.
insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
select a.id,
  'core_values_discovery',
  5,
  'FIRST LEGO League is done all over the world. Find out how many countries have FIRST LEGO League teams. Choose at least three of those countries and learn how to say “hello” and “My name is...” in languages spoken there. List the countries, languages, greetings, and introductions you found.',
  'long_text',
  true
from public.assignments a
where a.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number = 3
  and not a.published
on conflict (assignment_id, question_key) do update
set display_order = excluded.display_order,
    prompt = excluded.prompt,
    answer_type = excluded.answer_type,
    required = excluded.required;
