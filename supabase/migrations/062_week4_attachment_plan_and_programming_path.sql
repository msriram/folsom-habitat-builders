-- Rework the still-open Week 4 homework around the work actually completed in
-- Session 3. The questions intentionally make the wireframe a planning tool,
-- not a claim that the team has already taken field measurements.
do $$
declare
  target_assignment_id uuid;
begin
  select id into target_assignment_id
  from public.assignments
  where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
    and week_number = 4;

  if target_assignment_id is null then
    raise exception 'Week 4 assignment was not found for Habitat Builders';
  end if;

  update public.assignments
  set title = 'Model build and attachment plan',
      description = 'Turn a Session 3 model into a clear attachment sketch, wireframe route, and field-measurement plan for Session 4.'
  where id = target_assignment_id;

  delete from public.assignment_questions
  where assignment_id = target_assignment_id;

  insert into public.assignment_questions(assignment_id, question_key, display_order, prompt, answer_type, required)
  values
    (target_assignment_id, 'attachment_plan', 1, 'Choose one model your group built or worked on in Session 3. Name the model and its job. Then design one attachment for that model: where will it touch, will it push, pull, lift, guide, or carry, and in which direction or angle should it move?', 'long_text', true),
    (target_assignment_id, 'wireframe_route', 2, 'Open the BIOGLOW wireframe. Start the robot in one home base. Draw the model, your robot, its planned path, and arrows that show the attachment movement. In your answer, name the home base and describe the route in order.', 'long_text', true),
    (target_assignment_id, 'wireframe_measurements', 3, 'On the same wireframe, label 2-4 measurements the team needs before testing: for example, home base to model, attachment reach, turning room, or a model contact point. List the measurements and explain how each one will help Session 4 testing.', 'long_text', true),
    (target_assignment_id, 'spike_build_guide', 4, 'Read the SPIKE Prime building instructions. In your own words, name two build choices that make a robot sturdy and repeatable. Which one should Habitat Builders use first, and why?', 'long_text', true);
end $$;

-- Keep the homework programming sequence in the same order as the team plan.
update public.robot_homework_tasks t
set phase = v.phase,
    title = v.title,
    description = v.description,
    cs2n_url = v.url,
    hints = v.hints
from (values
  (4, 'required', 'Turning in place and craters', 'Complete Turning in Place and Turn Around the Craters.', 'https://www.cs2n.org/u/mp/badge_pages/2996', array['Test one turn at a time.', 'Start from the same position before comparing turns.']),
  (5, 'required', 'Swing turns and steering', 'Complete Swing Turns and Steer Around the Crater.', 'https://www.cs2n.org/u/mp/badge_pages/2999', array['Compare a swing turn with a turn in place.', 'Mark the path that keeps the robot clear of the crater.']),
  (6, 'required', 'Arm movement and spilled silverware', 'Build a controlled arm movement and plan an approach for Collecting Spilled Silverware.', 'https://www.cs2n.org/u/mp/badge_pages/2991', array['Check the arm travel slowly before increasing speed.', 'Approach loose pieces without pushing them farther away.']),
  (7, 'required', 'Forever loops and Search for Ice Part 1', 'Use Forever Loops while beginning Search for Ice Part 1.', 'https://www.cs2n.org/u/mp/badge_pages/3027', array['Test the repeating motion before joining it to the full search.', 'State what will make the program move to its next step.']),
  (8, 'required', 'Repeat loops and Search for Ice Part 2', 'Use Repeat Loops while continuing Search for Ice Part 2.', 'https://www.cs2n.org/u/mp/badge_pages/3027', array['Use a repeat count when the same motion happens a known number of times.', 'Keep the repeated movement easy to adjust.']),
  (9, 'required', 'Repeat Until and Search for Ice Part 3', 'Use Repeat Until while completing Search for Ice Part 3.', 'https://www.cs2n.org/u/mp/badge_pages/3027', array['Choose a condition the robot can sense or measure.', 'Test the ending condition before combining the run.']),
  (10, 'required', 'Wait Until Near and Move Until Near', 'Complete Wait Until Near and Move Until Near.', 'https://www.cs2n.org/u/mp/badge_pages/3014', array['A sensor waits for a condition before the next action.', 'Test with the object at two different distances.']),
  (11, 'required', 'Collapsed building sensor route', 'Complete Investigate the Collapsed Building, Wait for Green, Move Until Green, and Forward Until Stop Line.', 'https://www.cs2n.org/u/mp/badge_pages/3019', array['Test each sensor condition alone before combining steps.', 'Record the exact color or stop-line condition that worked.'])
) as v(week_number, phase, title, description, url, hints)
where t.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and t.week_number = v.week_number;
