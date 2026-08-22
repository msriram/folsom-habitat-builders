-- Refine drafts only. Published homework is never rewritten.
do $$
declare
  week3_id uuid;
  week4_id uuid;
begin
  select id into week3_id
  from public.assignments
  where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
    and week_number = 3
    and not published;

  if week3_id is not null then
    update public.assignments
    set title = 'Model build and Habitat Builders connection',
        description = 'Reflect on a Session 2 model, connect an individual biodiversity interest to Habitat Builders, and complete Discovery Activity 1.'
    where id = week3_id;

    delete from public.assignment_questions
    where assignment_id = week3_id
      and question_key in ('board_measurements', 'robot_maneuver');

    update public.assignment_questions
    set display_order = case question_key
          when 'project_sparks_summary' then 1
          when 'challenge_story_summary' then 2
          when 'model_build' then 3
          when 'model_purpose' then 4
          when 'core_values_discovery' then 5
        end,
        prompt = case question_key
          when 'model_build' then 'What model did you build, improve, or observe in Session 2? Rewatch the Robot Game Missions video, then explain in your own words how the model works and what kind of attachment could help a robot complete it. You may draw your idea and upload a photo. Be ready to explain it in class.'
          when 'model_purpose' then 'Mission name and Spark connection — our team name is Habitat Builders. Choose an interest angle that matters to you, such as invasive species, rainforest protection, or another biodiversity idea. How could Habitat Builders investigate or build something that helps?'
          else prompt
        end
    where assignment_id = week3_id
      and question_key in ('project_sparks_summary', 'challenge_story_summary', 'model_build', 'model_purpose', 'core_values_discovery');
  end if;

  select id into week4_id
  from public.assignments
  where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
    and week_number = 4
    and not published;

  if week4_id is not null then
    insert into public.assignment_questions(assignment_id, question_key, display_order, prompt, answer_type, required)
    values (week4_id, 'field_measurements', 2, 'What two field measurements or landmarks did the team record in Session 3? Explain how one measurement could help make a robot run more repeatable.', 'long_text', true)
    on conflict (assignment_id, question_key) do update
    set display_order = excluded.display_order,
        prompt = excluded.prompt,
        answer_type = excluded.answer_type,
        required = excluded.required;

    update public.assignment_questions
    set display_order = case question_key
          when 'remaining_models' then 1
          when 'field_measurements' then 2
          when 'base_robot_plan' then 3
          when 'first_attachment' then 4
          when 'team_name_cause_check' then 5
          when 'core_innovation_1' then 6
        end,
        prompt = case question_key
          when 'team_name_cause_check' then 'Our team name is Habitat Builders. How can this week’s robot work or project discussion connect to the biodiversity interest that matters most to you?'
          else prompt
        end
    where assignment_id = week4_id
      and question_key in ('remaining_models', 'field_measurements', 'base_robot_plan', 'first_attachment', 'team_name_cause_check', 'core_innovation_1');
  end if;
end $$;
