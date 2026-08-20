-- Week numbers match session numbers after Week 3: Week 4 is Session 4,
-- Week 5 is Session 5, through Week 12 / Session 12.
do $$
declare
  target_team_id uuid := 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f';
begin
  update public.assignments set title='Dock strategy and keystone species', description='Connect a mission strategy to a biodiversity idea and record the Session 4 team decision.' where team_id=target_team_id and week_number=4;
  update public.assignments set title='Research and existing solutions', description='Use Session 5 notebook prompts to research an existing solution and prepare an expert or user question.' where team_id=target_team_id and week_number=5;
  update public.assignments set title='Solution plan and pseudocode', description='Use Session 6 planning and pseudocode pages to describe the next test.' where team_id=target_team_id and week_number=6;
  update public.assignments set title='Prototype and test', description='Document a first prototype and one evidence-based improvement from Session 7.' where team_id=target_team_id and week_number=7;
  update public.assignments set title='Feedback and iteration', description='Use Session 8 feedback to make one clear project or robot revision.' where team_id=target_team_id and week_number=8;
  update public.assignments set title='Impact and mission strategy', description='Connect the project impact and robot mission strategy from Session 9.' where team_id=target_team_id and week_number=9;
  update public.assignments set title='Presentation draft', description='Use Session 10 to draft the team story, evidence, and Coopertition example.' where team_id=target_team_id and week_number=10;
  update public.assignments set title='Robot design explanation', description='Use Session 11 to explain the robot, attachment, code, and testing evidence.' where team_id=target_team_id and week_number=11;
  update public.assignments set title='Event rehearsal', description='Use Session 12 to reflect on presentation practice and identify one rehearsal priority.' where team_id=target_team_id and week_number=12;
  delete from public.assignment_questions q using public.assignments a where q.assignment_id=a.id and a.team_id=target_team_id and a.week_number between 4 and 12;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('mission_strategy',1,'Which mission strategy should the team investigate, and why?'),('biodiversity_connection',2,'What biodiversity idea or keystone species connects to this mission?'),('evidence',3,'What observation or source supports this connection?'),('team_decision',4,'What decision should the team make before Session 5?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=4;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('source',1,'What reliable source, person, or organization did you learn from?'),('existing_solution',2,'What existing solution did you find, and what did it teach you?'),('choice',3,'Should we create something new or improve an existing solution? Explain.'),('expert_question',4,'What question should we ask an expert or user?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=5;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('solution_plan',1,'What solution is the team planning, and what problem will it address?'),('steps',2,'List the important steps, materials, or limits we should plan for.'),('pseudocode',3,'Write simple pseudocode for one robot behavior we can test.'),('mission_test',4,'Which mission program will you test next, and what will success look like?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=6;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('prototype',1,'Describe or attach the first project prototype.'),('evidence',2,'How does the prototype help the people, animals, or habitat in the problem?'),('test_result',3,'What happened when you tested it? Include one observation.'),('next_change',4,'What is the next improvement to the prototype, robot, or attachment?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=7;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('feedback_source',1,'Who gave feedback, and what did they notice?'),('useful_feedback',2,'What was the most useful feedback?'),('revision',3,'What specific revision did you make because of it?'),('robot_iteration',4,'What changed in a robot program or attachment after testing?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=8;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('intended_impact',1,'What positive impact do you want the project to have?'),('mission_strategy',2,'Which mission strategy best supports the team’s plan, and why?'),('reliability',3,'What evidence shows the robot can repeat the mission?'),('next_improvement',4,'What is the next improvement for the project or robot?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=9;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('story_outline',1,'What is the beginning, middle, and end of the team’s five-minute story?'),('evidence',2,'What picture, test result, source, or model will make the story clear?'),('coopertition',3,'Describe one example of helping another team or learning from one.'),('contribution',4,'What part of the presentation will you help prepare?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=10;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('base_robot',1,'What is one important choice in the base robot design?'),('attachment_code',2,'Explain one attachment or code choice and its purpose.'),('test_revision',3,'What did a test teach you, and what did you change?'),('team_fun',4,'What has been fun about building or solving together?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=11;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
  select a.id,q.key,q.ord,q.prompt,'long_text',true from public.assignments a cross join (values
    ('presentation_reflection',1,'What part of the judging presentation feels strongest?'),('weakest_section',2,'Which section needs more practice?'),('recovery_plan',3,'What will you do if something does not work during a match or presentation?'),('coach_question',4,'What question do you want to ask the coach before the event?')
  ) q(key,ord,prompt) where a.team_id=target_team_id and a.week_number=12;
end $$;
