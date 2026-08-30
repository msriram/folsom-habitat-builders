-- Sessions 5-8 use the same practical rhythm: homework creates a design
-- brief; Friday practice builds, tests, records, and selects one next change.
-- Update drafts only so completed student work is never rewritten.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
begin
  update public.assignments a
  set title = v.title,
      description = v.description
  from (values
    (5, 'Attachment version 2 plan', 'Design the next attachment change and the five-run test that Session 5 will perform.'),
    (6, 'Mission attachment and test plan', 'Choose one robot action, design the attachment or code change, and define the evidence Session 6 must record.'),
    (7, 'Attachment revision plan', 'Use the last test record to design one clear attachment revision and a fair comparison test for Session 7.'),
    (8, 'Integrated attachment run plan', 'Plan the next attachment run, its reset steps, and the repeatability evidence Session 8 needs.')
  ) as v(week_number, title, description)
  where a.team_id = target_team_id
    and a.week_number = v.week_number
    and not a.published;

  delete from public.assignment_questions q
  using public.assignments a
  where q.assignment_id = a.id
    and a.team_id = target_team_id
    and a.week_number between 5 and 8
    and not a.published;

  insert into public.assignment_questions(assignment_id, question_key, display_order, prompt, answer_type, required)
  select a.id, v.question_key, v.display_order, v.prompt, 'long_text', true
  from public.assignments a
  join (values
    (5, 'attachment_target', 1, 'Choose one model or robot action for Session 5. What must the attachment accomplish, and where exactly should it contact the model?'),
    (5, 'attachment_sketch', 2, 'Draw the next attachment version. Label the contact point, motion direction or angle, and the part of the base robot where it attaches. Describe your drawing in words.'),
    (5, 'route_plan', 3, 'Choose a home base and write the route to the model in order. Include the approach direction and one place where the robot must slow down, square up, or turn.'),
    (5, 'five_run_test_plan', 4, 'Write the Session 5 test plan: what will count as a successful run, what will the team record on each of five tries, and what one change will you make if the first version fails?'),
    (6, 'mission_action_plan', 1, 'Choose the next model or scoring action. What should the robot and attachment each do, in order, from leaving home base to completing the action?'),
    (6, 'attachment_change_plan', 2, 'Sketch or describe the attachment change you want to build in Session 6. What problem from the last version does this change solve?'),
    (6, 'measurement_check', 3, 'List the two measurements, alignments, or sensor readings the team must check before running the new version.'),
    (6, 'test_record_plan', 4, 'Write a five-run test table in words: what will you record for every try, and what result would prove the new version is better than the old one?'),
    (7, 'revision_target', 1, 'Choose one result from the last robot test that needs improvement. What happened, and what is the specific failure you want to prevent?'),
    (7, 'revision_design', 2, 'Draw or describe one attachment revision. Label what changes, what stays the same, and why this version should work better.'),
    (7, 'comparison_plan', 3, 'Plan a fair comparison: how will the team keep the same home base, start position, model reset, and program while testing the old and new attachment?'),
    (7, 'decision_rule', 4, 'What result will make the team keep the new attachment, revise it again, or stop working on this model for now?'),
    (8, 'run_sequence_plan', 1, 'Choose one attachment action to add to a short robot run. Write the sequence from home base through the action and back to a safe stop or return.'),
    (8, 'reset_plan', 2, 'List what must be reset before every test: robot start position, attachment position, model position, and any program setting.'),
    (8, 'reliability_goal', 3, 'Set a repeatability goal for Session 8. How many successful runs out of ten will show that this action is ready to keep?'),
    (8, 'next_iteration_question', 4, 'What one question should the team answer from the Session 8 test record before designing the next attachment or route?')
  ) as v(week_number, question_key, display_order, prompt)
    on a.week_number = v.week_number
  where a.team_id = target_team_id
    and not a.published;
end $$;
