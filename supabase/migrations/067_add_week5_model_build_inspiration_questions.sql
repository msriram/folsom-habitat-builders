-- Preserve the original Week 5 question records and any answers already tied
-- to them.  These new prompts are the revised, forward-looking Week 5 work.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
begin
  update public.assignments
  set title = 'Model build inspiration and project curiosity',
      description = 'Reflect on early attachment tests, bring one useful build idea, and ask a meaningful Innovation Project question before Session 5.'
  where team_id = target_team_id
    and week_number = 5;

  insert into public.assignment_questions(assignment_id, question_key, display_order, prompt, answer_type, required)
  select a.id, v.question_key, v.display_order, v.prompt, 'long_text', true
  from public.assignments a
  join (values
    ('session4_observation', 11, 'Session 4 was an early build-and-test session. What did your group try, measure, or notice? Name one thing that still needs work; it is okay if nothing is working reliably yet.'),
    ('build_contribution', 12, 'For Session 5, which remaining build could you help with: the M8/M9 tree house, M13 or M15, or a base for M13–M15? What small job, part, or reset check could you take responsibility for?'),
    ('innovation_question', 13, 'Ask one real question about a local biodiversity problem the Habitat Builders could investigate. Why does this question matter to people, animals, plants, or a habitat?'),
    ('inspiration_to_share', 14, 'Watch the SPIKE build reference and one inspiration video in Week 5 homework. What one idea could the team adapt—not copy—for a base robot or attachment? It could be a sturdy mount, simple lift, guide, pusher, grabber, or quick-change connection. Explain how it might help our current models.')
  ) as v(question_key, display_order, prompt)
    on true
  where a.team_id = target_team_id
    and a.week_number = 5
  on conflict (assignment_id, question_key) do update
    set display_order = excluded.display_order,
        prompt = excluded.prompt;
end $$;
