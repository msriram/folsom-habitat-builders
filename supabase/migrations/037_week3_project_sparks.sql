-- Week 3: move from the team-name decision into an Innovation Project direction.
do $$
declare
  target_assignment_id uuid;
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
  coach_id uuid := '2bd55087-7c9b-431e-8306-6cc21e2bb345';
begin
  select a.id into target_assignment_id from public.assignments a where a.team_id = target_team_id and a.week_number = 3 limit 1;
  if target_assignment_id is null then
    insert into public.assignments(team_id,title,description,due_at,created_by,week_number,published)
    values(target_team_id,'Project Sparks and Challenge Story','Read the Project Sparks and Challenge Story pages in the Engineering Notebook, then turn one idea into a clear biodiversity problem the team can investigate.', '2026-08-27 00:00:00+00',coach_id,3,true)
    returning id into target_assignment_id;
  end if;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required) values
    (target_assignment_id,'project_spark',1,'Which Project Spark or different idea interests you most, and why?', 'long_text',true),
    (target_assignment_id,'problem_statement',2,'What biodiversity problem would you like the team to investigate? Who or what is affected?', 'long_text',true),
    (target_assignment_id,'existing_solution',3,'What existing solution, scientist, organization, or source should we learn from?', 'long_text',true),
    (target_assignment_id,'next_question',4,'What is one question we should bring to Session 3 or Session 4?', 'long_text',true)
  on conflict (assignment_id,question_key) do update set prompt=excluded.prompt,display_order=excluded.display_order,required=true;
end $$;
