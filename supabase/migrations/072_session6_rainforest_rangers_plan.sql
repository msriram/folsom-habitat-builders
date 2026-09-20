-- Session 5 was an early exploration session.  Preserve its recorded work and
-- any automatically carried checklist items, while making the first four
-- Session 6 and 7 checklist items match the published session plans.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
begin
  update public.assignments
  set title = 'Rainforest Rangers ideas and first attachment drawing',
      description = 'Use the shared Rainforest Rangers Google Doc to develop one Protect–Rebuild–Educate idea and draw a first attachment concept for Session 6.'
  where team_id = target_team_id
    and week_number = 6;

  insert into public.assignment_questions(assignment_id, question_key, display_order, prompt, answer_type, required)
  select assignment.id, item.question_key, item.display_order, item.prompt, 'long_text', false
  from public.assignments assignment
  join (values
    ('session5_carry_over', 11, 'Session 5 was an early attachment-and-measurement day. What is one robot, model, or field-setup item that still needs to be finished before we can test seriously?'),
    ('first_attachment_drawing', 12, 'Draw your first attachment idea for a model or robot action. Label what it would push, lift, guide, pull, or carry and where it would connect to the base robot.'),
    ('rainforest_rangers_idea', 13, 'Use the shared Rainforest Rangers Google Doc. Choose a rainforest habitat and explain one Protect–Rebuild–Educate idea: what needs protection, what could be rebuilt, or what should people learn?'),
    ('google_doc_finished', 14, 'After you add your thorough Rainforest Rangers write-up to the shared Google Doc, mark it complete.')
  ) as item(question_key, display_order, prompt) on true
  where assignment.team_id = target_team_id
    and assignment.week_number = 6
  on conflict (assignment_id, question_key) do update
    set display_order = excluded.display_order,
        prompt = excluded.prompt,
        required = excluded.required;

  insert into public.schedule_items(team_id, session_key, week_number, area, label, sort_order)
  select target_team_id, item.session_key, item.week_number, item.area, item.label, item.sort_order
  from (values
    ('meeting-06', 6, 'Robot', 'Finish the base robot: motors, hub, wheels, cables, bracing, and repeatable launch orientation', 1),
    ('meeting-06', 6, 'Robot', 'Verify every field model and base is present, placed correctly, operable, and resettable', 2),
    ('meeting-06', 6, 'Robot', 'Review first attachment drawings and select one initial attachment direction', 3),
    ('meeting-06', 6, 'Project', 'Discuss Rainforest Rangers Google Doc ideas: rainforest habitat and Protect–Rebuild–Educate direction', 4),
    ('meeting-07', 7, 'Robot', 'Build the first attachment prototype from the selected drawing', 1),
    ('meeting-07', 7, 'Robot', 'Measure attachment reach, launch reference, and model contact point', 2),
    ('meeting-07', 7, 'Robot', 'Write simple pseudocode and create the first program for one attachment action', 3),
    ('meeting-07', 7, 'Robot', 'Run exploratory trials and identify the next single change', 4)
  ) as item(session_key, week_number, area, label, sort_order)
  on conflict (team_id, session_key, sort_order) do update
    set week_number = excluded.week_number,
        area = excluded.area,
        label = excluded.label;
end $$;
