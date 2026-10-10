-- Week 7 has no submissions and is intentionally closed without changing its
-- record. Week 8 starts a short, event-focused three-part routine: one
-- Innovation Project response, one Core Values response, and one CS2N task.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
  week_eight_id uuid;
begin
  update public.assignments assignment
  set published = false
  where assignment.team_id = target_team_id
    and assignment.week_number = 7
    and not exists (select 1 from public.submissions submission where submission.assignment_id = assignment.id);

  select id into week_eight_id
  from public.assignments
  where team_id = target_team_id and week_number = 8;

  if week_eight_id is null then
    raise exception 'Week 8 assignment was not found';
  end if;

  update public.assignments
  set title = 'Golden tamarin protection ideas',
      description = 'Add one thoughtful Golden Lion Tamarin protection idea to the shared project document, complete one Core Values activity, and finish the Week 8 CS2N task.',
      published = true
  where id = week_eight_id;

  delete from public.assignment_questions where assignment_id = week_eight_id;

  insert into public.assignment_questions(assignment_id, question_key, display_order, prompt, answer_type, required)
  values
    (week_eight_id, 'golden_tamarin_solution', 1, 'Open the shared Golden Lion Tamarin project document. Choose one protection idea—such as a rope bridge, forest alert signal, tiny microphone or tracker, forest buffer zone, mixed-crop planting, community incentive, or a gamified awareness system. Explain how it could protect golden tamarins and biodiversity, who would use or maintain it, and one question the team should research before using the idea.', 'long_text', true),
    (week_eight_id, 'core_fun_2', 2, 'Create a Golden Lion Tamarin team mascot, drawing, or short cheer. Explain what it represents about protecting the animal, teamwork, or the team’s project.', 'long_text', true);
end $$;
