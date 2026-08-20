-- Week 3 has not been published. Its homework reflects the work completed in
-- Session 2 instead of repeating broad project-research prompts.
do $$
declare
  target_assignment_id uuid;
begin
  select id into target_assignment_id
  from public.assignments
  where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
    and week_number = 3
    and not published;

  if target_assignment_id is null then
    raise notice 'Week 3 is already published; no homework changes were made.';
    return;
  end if;

  update public.assignments
  set title = 'Session 2 build, field map, and robot movement',
      description = 'Reflect on Session 2 models, board measurements, and robot movement, then complete Discovery Activity 1.'
  where id = target_assignment_id;

  delete from public.assignment_questions where assignment_id = target_assignment_id;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required) values
    (target_assignment_id,'model_build',1,'Which numbered model did you help build, improve, or observe in Session 2 (Model 5, 6, 7, or 1)? Describe what it is meant to do and one detail you noticed.','long_text',true),
    (target_assignment_id,'model_purpose',2,'Pick one model from Session 2. What happens when the robot interacts with it, and what kind of attachment, push, pull, or movement might be useful?','long_text',true),
    (target_assignment_id,'board_measurements',3,'Record two board measurements from Session 2. Name the start and end landmarks for each measurement, and explain how one measurement could help a robot run.','long_text',true),
    (target_assignment_id,'robot_maneuver',4,'Describe one robot movement or maneuver your group tried. What did it do, what worked or did not work, and what is one change you would test next?','long_text',true),
    (target_assignment_id,'core_values_discovery',5,'FIRST LEGO League is done all over the world. Find out how many countries have FIRST LEGO League teams. Choose at least three of those countries and learn how to say “hello” and “My name is...” in languages spoken there. List the countries, languages, greetings, and introductions you found.','long_text',true);
end $$;
