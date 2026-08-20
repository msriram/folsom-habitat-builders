-- Future homework is still unpublished. Build a connected weekly progression:
-- robot models -> base robot/attachments -> repeatability -> points/timing,
-- with a lighter biodiversity project track and one Core Values task each week.
with planned(week_number,title,description) as (values
  (4,'Finish models and plan the base robot','Finish needed models, identify base-robot needs, and keep the team name and cause in view.'),
  (5,'Base robot driving and first attachment','Use driving observations to improve the base robot and test one simple attachment idea.'),
  (6,'First reliable mission and project research plan','Document one repeatable mission approach and choose a useful next project research step.'),
  (7,'Second mission and team communication','Add a second mission or attachment, record what changed, and practice clear teamwork.'),
  (8,'Reliable runs and project prototype','Use several test runs to find a failure pattern and shape a first project prototype.'),
  (9,'Points, timing, and project evidence','Compare score, time, and risk while collecting evidence for the project direction.'),
  (10,'Match strategy and positive impact','Choose reliable points, protect the time budget, and explain the project’s positive impact.'),
  (11,'Timed match and project story','Practice a timed run and turn the project work into a clear team story.'),
  (12,'Final reliability and team celebration','Complete final run checks, rehearse the project explanation, and celebrate team strengths.')
)
update public.assignments a
set title=planned.title,description=planned.description
from planned
where a.team_id='b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number=planned.week_number
  and not a.published;

delete from public.assignment_questions q
using public.assignments a
where q.assignment_id=a.id
  and a.team_id='b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number between 4 and 12
  and not a.published;

insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
select a.id,v.question_key,v.display_order,v.prompt,'long_text',true
from public.assignments a
join (values
  (4,'remaining_models',1,'Which mission model did the team finish, improve, or still need to finish after Session 3? What does that model do?'),
  (4,'base_robot_plan',2,'What should the base robot do well before we add complicated attachments? Name two design or driving priorities.'),
  (4,'first_attachment',3,'Choose one model or mission. What simple attachment action might help: push, pull, lift, guide, or carry? Explain your first idea.'),
  (4,'team_name_cause_check',4,'Write the current team name and biodiversity cause. How can this week’s robot work or discussion help the team stay connected to that cause?'),
  (4,'core_innovation_1',5,'Choose a small object and a marked area. List three different ways a robot or person could move the object into the area. Which idea would you test first, and why?'),
  (5,'drive_baseline',1,'Describe one straight drive, turn, or wall-square test from Session 4. What measurement, setting, or starting position made it more repeatable?'),
  (5,'attachment_test',2,'What attachment idea did the team try or plan? What is its job, and what needs to happen for it to work?'),
  (5,'run_observation',3,'What happened in one test run? Include one observation, not just whether it succeeded.'),
  (5,'project_cause_check',4,'Restate the team’s biodiversity cause in one sentence. What person, animal, habitat, or community should the project help?'),
  (5,'core_impact_1',5,'Choose a mission the team is working on. How does it connect to BIOGLOW, and what are two different ways the mission could be solved?'),
  (6,'first_reliable_mission',1,'Which mission or model did the team try to make reliable? Describe the robot action and the final result you wanted.'),
  (6,'test_evidence',2,'Record results from at least three attempts, or explain what the team still needs to test before calling the idea reliable.'),
  (6,'next_attachment_change',3,'What one change would you make to the attachment, start position, or program before testing again?'),
  (6,'project_research_step',4,'What is one useful question the team should answer about its biodiversity cause before deciding on a project solution?'),
  (6,'core_inclusion_2',5,'Think of one way to make the Robot Game or a team practice easier for someone else to join and enjoy. Explain how the idea could help everyone.'),
  (7,'second_mission_plan',1,'What second mission or model did the team add to its plan? What robot action is needed?'),
  (7,'attachment_iteration',2,'What did the team change after the first attachment test, and why?'),
  (7,'handoff_communication',3,'What information must a teammate know to reset, launch, or test this run correctly?'),
  (7,'project_solution_idea',4,'Name one possible project solution idea for the team’s cause. What would it need to do to be helpful?'),
  (7,'core_teamwork_1',5,'Write each teammate’s name, one thing you think they do well, and one skill or habit they could improve. Be specific and kind.'),
  (8,'five_run_result',1,'Choose one robot action and record the result of five tries. How many worked, and what pattern did you notice?'),
  (8,'failure_pattern',2,'Describe one failure or near-miss. What likely caused it, and what is the next change to test?'),
  (8,'prototype_sketch',3,'Describe or draw a first project prototype, model, or explanation. How could it help with the team’s biodiversity cause?'),
  (8,'project_feedback',4,'Whose feedback would help the project next, and what one question would you ask them?'),
  (8,'core_fun_2',5,'Design a team mascot. What should it represent about the team, the Core Values, or the biodiversity cause? You may draw it and upload a photo.'),
  (9,'run_score',1,'What points could the current robot run earn if every intended action works? Which point is most important to protect?'),
  (9,'time_budget',2,'How long did the run take, or how long should it take? Where could the team save time without making the run less reliable?'),
  (9,'risk_choice',3,'Name one risky action the team should keep testing and one reliable action it should keep. Explain the tradeoff.'),
  (9,'project_evidence',4,'What observation, source, interview, or test result would be useful evidence for the team’s project cause?'),
  (9,'core_discovery_2',5,'Learn about the four parts of FIRST LEGO League: game, engineering design, Core Values, and project. What does a team do for each part at an event?'),
  (10,'match_strategy',1,'List the missions or actions in the order the team plans to attempt them. Why is this order sensible?'),
  (10,'points_time_choice',2,'Which mission is worth its time right now, and which mission should wait until it becomes more reliable?'),
  (10,'timed_run_note',3,'Describe one timed practice result. What happened before, during, or after the run that affected the time?'),
  (10,'project_impact_plan',4,'How could the team’s chosen project idea create a positive change for the people, animals, habitat, or community connected to its cause?'),
  (10,'core_impact_2',5,'How does the BIOGLOW season theme encourage teams to make an impact? Choose one previous FIRST LEGO League season theme and compare the kind of positive change it encouraged.'),
  (11,'best_timed_run',1,'What was the team’s best timed run so far? State the score or completed actions, the time, and what made it work.'),
  (11,'recovery_plan',2,'If one attachment or mission fails during a match, what should the team do next instead of losing too much time?'),
  (11,'project_story',3,'Write a short beginning, middle, and end for the team project story: the cause, what the team learned, and the idea or evidence it will share.'),
  (11,'skill_to_share',4,'What robot, coding, research, or presentation skill could you teach a teammate this week?'),
  (11,'core_teamwork_3',5,'Choose one skill you can teach a teammate. Write three clear tips that would make the skill easier to learn.'),
  (12,'final_checklist',1,'What needs to be packed, reset, or checked before the next full practice or event?'),
  (12,'repeatability_check',2,'Which run still needs more repeatable tests? What result would convince you it is ready?'),
  (12,'project_rehearsal',3,'What part of the project explanation is already clear, and what question from a judge or guest should the team practice answering?'),
  (12,'team_award',4,'Write a kind award idea for one teammate or for the whole team. What strength does it recognize?'),
  (12,'core_fun_3',5,'Create a kind award idea for each teammate or for the whole team. Explain what each award recognizes.')
) as v(week_number,question_key,display_order,prompt)
  on a.week_number=v.week_number
where a.team_id='b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and not a.published;
