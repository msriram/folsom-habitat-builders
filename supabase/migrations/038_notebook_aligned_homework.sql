-- Keep the database assignments in the same Session -> Week sequence as the
-- Engineering Notebook. Week 1 was Session 1; Week 2 is Session 2; Core Values
-- begins with Week 3. Coach review is feedback-only; no marks are assigned here.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
  coach_id uuid := '2bd55087-7c9b-431e-8306-6cc21e2bb345';
  target_assignment_id uuid;
begin
  -- Week 2 replaces the old team-name worksheet with Session 2 preparation.
  select id into target_assignment_id from public.assignments where team_id = target_team_id and week_number = 2;
  if target_assignment_id is null then
    insert into public.assignments(team_id,title,description,due_at,created_by,week_number,published)
    values(target_team_id,'Build, measure, and map the field','Continue the Session 1 builds, measure the board, and connect distances to repeatable robot movement.', '2026-08-26 23:59:00-07',coach_id,2,true)
    returning id into target_assignment_id;
  else
    update public.assignments set title='Build, measure, and map the field', description='Continue the Session 1 builds, measure the board, and connect distances to repeatable robot movement.', due_at='2026-08-26 23:59:00-07', published=true where id=target_assignment_id;
  end if;
  delete from public.assignment_questions where assignment_id = target_assignment_id;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required) values
    (target_assignment_id,'build_progress',1,'What did you build or improve in Session 1, and what will you continue in Session 2?','long_text',true),
    (target_assignment_id,'board_measurements',2,'What board distances, landmarks, or boundaries did you measure?','long_text',true),
    (target_assignment_id,'motor_mapping',3,'How could a measured distance connect to motor rotations or another repeatable program value?','long_text',true),
    (target_assignment_id,'program_test',4,'What did your first movement program do well, and what will you test next?','long_text',true),
    (target_assignment_id,'cs2n_reflection',5,'How did your CS2N program work?','long_text',true);

  -- Weeks 3-12 follow Sessions 3-12 and the notebook's event preparation pages.
  for target_assignment_id in select id from public.assignments where team_id=target_team_id and week_number between 3 and 12 loop
    delete from public.assignment_questions where assignment_id=target_assignment_id;
  end loop;
  insert into public.assignments(team_id,title,description,due_at,created_by,week_number,published) values
    (target_team_id,'Project Sparks and Challenge Story','Read the Project Sparks and Challenge Story pages and choose a biodiversity problem to investigate.','2026-09-02 23:59:00-07',coach_id,3,true),
    (target_team_id,'Research and existing solutions','Use Session 5 notebook prompts to research an existing solution and prepare an expert or user question.','2026-09-09 23:59:00-07',coach_id,4,true),
    (target_team_id,'Solution plan and pseudocode','Use the Session 6 planning and pseudocode pages to describe the next test.','2026-09-16 23:59:00-07',coach_id,5,true),
    (target_team_id,'Prototype and test','Document a first prototype and one evidence-based improvement from Session 7.','2026-09-23 23:59:00-07',coach_id,6,true),
    (target_team_id,'Feedback and iteration','Use Session 8 feedback to make one clear project or robot revision.','2026-09-30 23:59:00-07',coach_id,7,true),
    (target_team_id,'Impact and mission strategy','Connect the project impact and robot mission strategy from Session 9.','2026-10-07 23:59:00-07',coach_id,8,true),
    (target_team_id,'Presentation draft','Use Session 10 to draft the team story, evidence, and Coopertition example.','2026-10-14 23:59:00-07',coach_id,9,true),
    (target_team_id,'Robot design explanation','Use Session 11 to explain the robot, attachment, code, and testing evidence.','2026-10-21 23:59:00-07',coach_id,10,true),
    (target_team_id,'Event rehearsal','Use Session 12 to reflect on presentation practice and identify one rehearsal priority.','2026-10-28 23:59:00-07',coach_id,11,true),
    (target_team_id,'Final reflection and readiness','Use the Event Preparation and Rubrics pages to make the final readiness checklist.','2026-11-04 23:59:00-07',coach_id,12,true)
  on conflict (team_id,week_number) where week_number is not null do update set title=excluded.title,description=excluded.description,due_at=excluded.due_at,published=true;

  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true
  from public.assignments a cross join (values
    ('project_spark',1,'Which Project Spark or different idea interests you most, and why?'),('problem_statement',2,'What biodiversity problem would you like the team to investigate? Who or what is affected?'),('existing_solution',3,'What existing solution, scientist, organization, or source should we learn from?'),('next_question',4,'What is one question we should bring to Session 3 or Session 4?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=3;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('source',1,'What reliable source, person, or organization did you learn from?'),('existing_solution',2,'What existing solution did you find, and what did it teach you?'),('choice',3,'Should we create something new or improve an existing solution? Explain.'),('expert_question',4,'What question should we ask an expert or user?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=4;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('solution_plan',1,'What solution is the team planning, and what problem will it address?'),('steps',2,'List the important steps, materials, or limits we should plan for.'),('pseudocode',3,'Write simple pseudocode for one robot behavior we can test.'),('mission_test',4,'Which mission program will you test next, and what will success look like?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=5;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('prototype',1,'Describe or attach the first project prototype.'),('evidence',2,'How does the prototype help the people, animals, or habitat in the problem?'),('test_result',3,'What happened when you tested it? Include one observation.'),('next_change',4,'What is the next improvement to the prototype, robot, or attachment?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=6;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('feedback_source',1,'Who gave feedback, and what did they notice?'),('useful_feedback',2,'What was the most useful feedback?'),('revision',3,'What specific revision did you make because of it?'),('robot_iteration',4,'What changed in a robot program or attachment after testing?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=7;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('intended_impact',1,'What positive impact do you want the project to have?'),('mission_strategy',2,'Which mission strategy best supports the team’s plan, and why?'),('reliability',3,'What evidence shows the robot can repeat the mission?'),('next_improvement',4,'What is the next improvement for the project or robot?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=8;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('story_outline',1,'What is the beginning, middle, and end of the team’s five-minute story?'),('evidence',2,'What picture, test result, source, or model will make the story clear?'),('coopertition',3,'Describe one example of helping another team or learning from one.'),('contribution',4,'What part of the presentation will you help prepare?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=9;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('base_robot',1,'What is one important choice in the base robot design?'),('attachment_code',2,'Explain one attachment or code choice and its purpose.'),('test_revision',3,'What did a test teach you, and what did you change?'),('team_fun',4,'What has been fun about building or solving together?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=10;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('presentation_reflection',1,'What part of the judging presentation feels strongest?'),('weakest_section',2,'Which section needs more practice?'),('recovery_plan',3,'What will you do if something does not work during a match or presentation?'),('coach_question',4,'What question do you want to ask the coach before the event?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=11;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('biggest_learning',1,'What is the biggest thing you learned this season?'),('remaining_risk',2,'What is the one remaining risk the team should manage?'),('packing',3,'What should be on the final robot, project, and presentation checklist?'),('team_goal',4,'What is the team’s goal for the event, and how will you support it?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=12;
end $$;
