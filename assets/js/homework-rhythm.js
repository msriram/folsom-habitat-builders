// Keep the visible homework rhythm tied to the season calendar.  The team season
// starts on Sunday, August 2, 2026, so the active week changes at local midnight
// each Sunday without requiring a content edit or deployment.
const SEASON_START = new Date(2026, 7, 2);
const DAY = 24 * 60 * 60 * 1000;

const fallbackAssignments = {
  0: { title: 'Explore biodiversity and understand the game', due: 'Wednesday, August 5', priority: 'Finish the biodiversity paragraph and bring one rules question to Session 1.' },
  1: { title: 'Field and robot baseline', due: 'Wednesday, August 12', priority: 'Use the notebook to prepare for Session 1: establish the field baseline, build a first mechanism, and test a simple movement.' },
  2: { title: 'Choose a team name and a cause anchor', due: 'Wednesday, August 19', priority: 'Connect our biodiversity interests to a team name, a cause, and one question we can investigate together.' },
  3: { title: 'Model build and Habitat Builders connection', due: 'Wednesday, August 26', priority: 'Reflect on a Session 2 model, connect an individual interest to Habitat Builders, and complete Discovery Activity 1.' },
  4: { title: 'Dock strategy and keystone species', due: 'Wednesday, September 2', priority: 'Use Session 4 to connect a mission strategy to a biodiversity idea and record the team decision.' },
  5: { title: 'Research and existing solutions', due: 'Wednesday, September 9', priority: 'Bring one reliable source, one existing solution, and one expert or user question to Session 5.' },
  6: { title: 'Solution plan and pseudocode', due: 'Wednesday, September 16', priority: 'Turn the team idea into a plan and a small robot program you can test in Session 6.' },
  7: { title: 'Prototype and test', due: 'Wednesday, September 23', priority: 'Document a first prototype, what happened in Session 7 testing, and the next change.' },
  8: { title: 'Feedback and iteration', due: 'Wednesday, September 30', priority: 'Use Session 8 feedback to make one clear improvement to the project or robot.' },
  9: { title: 'Impact and mission strategy', due: 'Wednesday, October 7', priority: 'Explain the intended impact and the mission strategy from Session 9.' },
  10: { title: 'Presentation draft', due: 'Wednesday, October 14', priority: 'Draft the team story, evidence, and one example of Coopertition for Session 10.' },
  11: { title: 'Robot design explanation', due: 'Wednesday, October 21', priority: 'Explain the base robot, an attachment, and the code or testing evidence from Session 11.' },
  12: { title: 'Event rehearsal', due: 'Wednesday, October 28', priority: 'Practice the judging presentation, robot explanation, and event plan in Session 12.' }
};

const notebookHomework = {
  4: { session: 4, title: 'Dock strategy and keystone species', page: 'Session 4 · Mission and project connection', link: 'meeting-04.html', questions: [['mission_strategy','Which mission strategy should the team investigate, and why?'],['biodiversity_connection','What biodiversity idea or keystone species connects to this mission?'],['evidence','What observation or source supports this connection?'],['team_decision','What decision should the team make before Session 5?']] },
  5: { session: 5, title: 'Research and existing solutions', page: 'Session 5 · Teamwork', link: 'meeting-05.html', questions: [['source','What reliable source, person, or organization did you learn from?'],['existing_solution','What existing solution did you find, and what did it teach you?'],['choice','Should we create something new or improve an existing solution? Explain.'],['expert_question','What question should we ask an expert or user?']] },
  6: { session: 6, title: 'Solution plan and pseudocode', page: 'Session 6 · Innovation', link: 'meeting-06.html', questions: [['solution_plan','What solution is the team planning, and what problem will it address?'],['steps','List the important steps, materials, or limits we should plan for.'],['pseudocode','Write simple pseudocode for one robot behavior we can test.'],['mission_test','Which mission program will you test next, and what will success look like?']] },
  7: { session: 7, title: 'Prototype and test', page: 'Session 7 · Gracious Professionalism', link: 'meeting-07.html', questions: [['prototype','Describe or attach the first project prototype.'],['evidence','How does the prototype help the people, animals, or habitat in the problem?'],['test_result','What happened when you tested it? Include one observation.'],['next_change','What is the next improvement to the prototype, robot, or attachment?']] },
  8: { session: 8, title: 'Feedback and iteration', page: 'Session 8 · Inclusion', link: 'meeting-08.html', questions: [['feedback_source','Who gave feedback, and what did they notice?'],['useful_feedback','What was the most useful feedback?'],['revision','What specific revision did you make because of it?'],['robot_iteration','What changed in a robot program or attachment after testing?']] },
  9: { session: 9, title: 'Impact and mission strategy', page: 'Session 9 · Impact', link: 'meeting-09.html', questions: [['intended_impact','What positive impact do you want the project to have?'],['mission_strategy','Which mission strategy best supports the team’s plan, and why?'],['reliability','What evidence shows the robot can repeat the mission?'],['next_improvement','What is the next improvement for the project or robot?']] },
  10: { session: 10, title: 'Presentation draft', page: 'Session 10 · Coopertition', link: 'meeting-10.html', questions: [['story_outline','What is the beginning, middle, and end of the team’s five-minute story?'],['evidence','What picture, test result, source, or model will make the story clear?'],['coopertition','Describe one example of helping another team or learning from one.'],['contribution','What part of the presentation will you help prepare?']] },
  11: { session: 11, title: 'Robot design explanation', page: 'Session 11 · Fun', link: 'meeting-11.html', questions: [['base_robot','What is one important choice in the base robot design?'],['attachment_code','Explain one attachment or code choice and its purpose.'],['test_revision','What did a test teach you, and what did you change?'],['team_fun','What has been fun about building or solving together?']] },
  12: { session: 12, title: 'Event rehearsal', page: 'Session 12 · Event Time', link: 'meeting-12.html', questions: [['presentation_reflection','What part of the judging presentation feels strongest?'],['weakest_section','Which section needs more practice?'],['recovery_plan','What will you do if something does not work during a match or presentation?'],['coach_question','What question do you want to ask the coach before the event?']] }
};

// Future homework follows the work completed in the previous session and
// prepares the next one. The robot track grows from model builds to reliable,
// timed scoring runs; the project track stays lighter but keeps the team name
// and biodiversity cause visible throughout.
Object.assign(fallbackAssignments, {
  4: { title: 'Finish models and plan the base robot', due: 'Wednesday, September 2', priority: 'Finish the needed models, identify base-robot needs, and keep the team name and cause in view.' },
  5: { title: 'Base robot driving and first attachment', due: 'Wednesday, September 9', priority: 'Use driving observations to improve the base robot and test one simple attachment idea.' },
  6: { title: 'First reliable mission and project research plan', due: 'Wednesday, September 16', priority: 'Document one repeatable mission approach and choose a useful next project research step.' },
  7: { title: 'Second mission and team communication', due: 'Wednesday, September 23', priority: 'Add a second mission or attachment, record what changed, and practice clear teamwork.' },
  8: { title: 'Reliable runs and project prototype', due: 'Wednesday, September 30', priority: 'Use several test runs to find a failure pattern and shape a first project prototype.' },
  9: { title: 'Points, timing, and project evidence', due: 'Wednesday, October 7', priority: 'Compare score, time, and risk while collecting evidence for the project direction.' },
  10: { title: 'Match strategy and positive impact', due: 'Wednesday, October 14', priority: 'Choose reliable points, protect the time budget, and explain the project’s positive impact.' },
  11: { title: 'Timed match and project story', due: 'Wednesday, October 21', priority: 'Practice a timed run and turn the project work into a clear team story.' },
  12: { title: 'Final reliability and team celebration', due: 'Wednesday, October 28', priority: 'Complete final run checks, rehearse the project explanation, and celebrate team strengths.' }
});

Object.assign(notebookHomework, {
  4: { session: 4, reflects: 3, title: 'Finish models and plan the base robot', link: 'meeting-04.html', core: { label: 'Innovation · Activity 1', href: 'downloads/bioglow/core-values-innovation-1.pdf', task: 'Choose a small object and a marked area. List three different ways a robot or person could move the object into the area. Which idea would you test first, and why?' }, questions: [['remaining_models','Which mission model did the team finish, improve, or still need to finish after Session 3? What does that model do?'],['base_robot_plan','What should the base robot do well before we add complicated attachments? Name two design or driving priorities.'],['first_attachment','Choose one model or mission. What simple attachment action might help: push, pull, lift, guide, or carry? Explain your first idea.'],['team_name_cause_check','Write the current team name and biodiversity cause. How can this week’s robot work or discussion help the team stay connected to that cause?'],['core_innovation_1','Choose a small object and a marked area. List three different ways a robot or person could move the object into the area. Which idea would you test first, and why?']] },
  5: { session: 5, reflects: 4, title: 'Base robot driving and first attachment', link: 'meeting-05.html', core: { label: 'Impact · Activity 1', href: 'downloads/bioglow/core-values-impact-1.pdf', task: 'Choose a mission the team is working on. How does it connect to BIOGLOW, and what are two different ways the mission could be solved?' }, questions: [['drive_baseline','Describe one straight drive, turn, or wall-square test from Session 4. What measurement, setting, or starting position made it more repeatable?'],['attachment_test','What attachment idea did the team try or plan? What is its job, and what needs to happen for it to work?'],['run_observation','What happened in one test run? Include one observation, not just whether it succeeded.'],['project_cause_check','Restate the team’s biodiversity cause in one sentence. What person, animal, habitat, or community should the project help?'],['core_impact_1','Choose a mission the team is working on. How does it connect to BIOGLOW, and what are two different ways the mission could be solved?']] },
  6: { session: 6, reflects: 5, title: 'First reliable mission and project research plan', link: 'meeting-06.html', core: { label: 'Inclusion · Activity 2', href: 'downloads/bioglow/core-values-inclusion-2.pdf', task: 'Think of one way to make the Robot Game or a team practice easier for someone else to join and enjoy. Explain how the idea could help everyone.' }, questions: [['first_reliable_mission','Which mission or model did the team try to make reliable? Describe the robot action and the final result you wanted.'],['test_evidence','Record results from at least three attempts, or explain what the team still needs to test before calling the idea reliable.'],['next_attachment_change','What one change would you make to the attachment, start position, or program before testing again?'],['project_research_step','What is one useful question the team should answer about its biodiversity cause before deciding on a project solution?'],['core_inclusion_2','Think of one way to make the Robot Game or a team practice easier for someone else to join and enjoy. Explain how the idea could help everyone.']] },
  7: { session: 7, reflects: 6, title: 'Second mission and team communication', link: 'meeting-07.html', core: { label: 'Teamwork · Activity 1', href: 'downloads/bioglow/core-values-teamwork-1.pdf', task: 'Write each teammate’s name, one thing you think they do well, and one skill or habit they could improve. Be specific and kind.' }, questions: [['second_mission_plan','What second mission or model did the team add to its plan? What robot action is needed?'],['attachment_iteration','What did the team change after the first attachment test, and why?'],['handoff_communication','What information must a teammate know to reset, launch, or test this run correctly?'],['project_solution_idea','Name one possible project solution idea for the team’s cause. What would it need to do to be helpful?'],['core_teamwork_1','Write each teammate’s name, one thing you think they do well, and one skill or habit they could improve. Be specific and kind.']] },
  8: { session: 8, reflects: 7, title: 'Reliable runs and project prototype', link: 'meeting-08.html', core: { label: 'Fun · Activity 2', href: 'downloads/bioglow/core-values-fun-2.pdf', task: 'Design a team mascot. What should it represent about the team, the Core Values, or the biodiversity cause? You may draw it and upload a photo.' }, questions: [['five_run_result','Choose one robot action and record the result of five tries. How many worked, and what pattern did you notice?'],['failure_pattern','Describe one failure or near-miss. What likely caused it, and what is the next change to test?'],['prototype_sketch','Describe or draw a first project prototype, model, or explanation. How could it help with the team’s biodiversity cause?'],['project_feedback','Whose feedback would help the project next, and what one question would you ask them?'],['core_fun_2','Design a team mascot. What should it represent about the team, the Core Values, or the biodiversity cause? You may draw it and upload a photo.']] },
  9: { session: 9, reflects: 8, title: 'Points, timing, and project evidence', link: 'meeting-09.html', core: { label: 'Discovery · Activity 2', href: 'downloads/bioglow/core-values-discovery-2.pdf', task: 'Learn about the four parts of FIRST LEGO League: game, engineering design, Core Values, and project. What does a team do for each part at an event?' }, questions: [['run_score','What points could the current robot run earn if every intended action works? Which point is most important to protect?'],['time_budget','How long did the run take, or how long should it take? Where could the team save time without making the run less reliable?'],['risk_choice','Name one risky action the team should keep testing and one reliable action it should keep. Explain the tradeoff.'],['project_evidence','What observation, source, interview, or test result would be useful evidence for the team’s project cause?'],['core_discovery_2','Learn about the four parts of FIRST LEGO League: game, engineering design, Core Values, and project. What does a team do for each part at an event?']] },
  10: { session: 10, reflects: 9, title: 'Match strategy and positive impact', link: 'meeting-10.html', core: { label: 'Impact · Activity 2', href: 'downloads/bioglow/core-values-impact-2.pdf', task: 'How does the BIOGLOW season theme encourage teams to make an impact? Choose one previous FIRST LEGO League season theme and compare the kind of positive change it encouraged.' }, questions: [['match_strategy','List the missions or actions in the order the team plans to attempt them. Why is this order sensible?'],['points_time_choice','Which mission is worth its time right now, and which mission should wait until it becomes more reliable?'],['timed_run_note','Describe one timed practice result. What happened before, during, or after the run that affected the time?'],['project_impact_plan','How could the team’s chosen project idea create a positive change for the people, animals, habitat, or community connected to its cause?'],['core_impact_2','How does the BIOGLOW season theme encourage teams to make an impact? Choose one previous FIRST LEGO League season theme and compare the kind of positive change it encouraged.']] },
  11: { session: 11, reflects: 10, title: 'Timed match and project story', link: 'meeting-11.html', core: { label: 'Teamwork · Activity 3', href: 'downloads/bioglow/core-values-teamwork-3.pdf', task: 'Choose one skill you can teach a teammate. Write three clear tips that would make the skill easier to learn.' }, questions: [['best_timed_run','What was the team’s best timed run so far? State the score or completed actions, the time, and what made it work.'],['recovery_plan','If one attachment or mission fails during a match, what should the team do next instead of losing too much time?'],['project_story','Write a short beginning, middle, and end for the team project story: the cause, what the team learned, and the idea or evidence it will share.'],['skill_to_share','What robot, coding, research, or presentation skill could you teach a teammate this week?'],['core_teamwork_3','Choose one skill you can teach a teammate. Write three clear tips that would make the skill easier to learn.']] },
  12: { session: 12, reflects: 11, title: 'Final reliability and team celebration', link: 'meeting-12.html', core: { label: 'Fun · Activity 3', href: 'downloads/bioglow/core-values-fun-3.pdf', task: 'Create a kind award idea for each teammate or for the whole team. Explain what each award recognizes.' }, questions: [['final_checklist','What needs to be packed, reset, or checked before the next full practice or event?'],['repeatability_check','Which run still needs more repeatable tests? What result would convince you it is ready?'],['project_rehearsal','What part of the project explanation is already clear, and what question from a judge or guest should the team practice answering?'],['team_award','Write a kind award idea for one teammate or for the whole team. What strength does it recognize?'],['core_fun_3','Create a kind award idea for each teammate or for the whole team. Explain what each award recognizes.']] }
});

// Coach views read this same source instead of carrying a second copy of the
// season's homework focus. Update the homework rhythm and the coach view
// updates with it.
// Session 3 measurement work becomes a Week 4 reflection, not retroactive
// Week 3 homework.
notebookHomework[4] = {
  session: 4,
  reflects: 3,
  title: 'Finish models and plan the base robot',
  link: 'meeting-04.html',
  core: { label: 'Innovation · Activity 1', href: 'downloads/bioglow/core-values-innovation-1.pdf', task: 'Choose a small object and a marked area. List three different ways a robot or person could move the object into the area. Which idea would you test first, and why?' },
  questions: [
    ['remaining_models', 'Which mission model did the team finish, improve, or still need to finish after Session 3? What does that model do?'],
    ['field_measurements', 'What two field measurements or landmarks did the team record in Session 3? Explain how one measurement could help make a robot run more repeatable.'],
    ['base_robot_plan', 'What should the base robot do well before we add complicated attachments? Name two design or driving priorities.'],
    ['first_attachment', 'Choose one model or mission. What simple attachment action might help: push, pull, lift, guide, or carry? Explain your first idea.'],
    ['team_name_cause_check', 'Our team name is Habitat Builders. How can this week’s robot work or project discussion connect to the biodiversity interest that matters most to you?'],
    ['core_innovation_1', 'Choose a small object and a marked area. List three different ways a robot or person could move the object into the area. Which idea would you test first, and why?']
  ]
};

window.FIREFLIES_HOMEWORK_RHYTHM = { assignments: fallbackAssignments, notebookHomework };

const futureTaskTitles = {
  remaining_models: 'Mission model reflection', field_measurements: 'Field measurements', base_robot_plan: 'Base robot priorities', first_attachment: 'First attachment idea', team_name_cause_check: 'Team name and cause check',
  drive_baseline: 'Driving baseline', attachment_test: 'Attachment test', run_observation: 'Test-run observation', project_cause_check: 'Project cause check',
  first_reliable_mission: 'Reliable mission goal', test_evidence: 'Testing evidence', next_attachment_change: 'Next attachment change', project_research_step: 'Project research step',
  second_mission_plan: 'Second mission plan', attachment_iteration: 'Attachment iteration', handoff_communication: 'Team handoff', project_solution_idea: 'Project solution idea',
  five_run_result: 'Five-run result', failure_pattern: 'Failure pattern', prototype_sketch: 'Project prototype', project_feedback: 'Project feedback',
  run_score: 'Run score', time_budget: 'Time budget', risk_choice: 'Risk and reliability choice', project_evidence: 'Project evidence',
  match_strategy: 'Match strategy', points_time_choice: 'Points and time choice', timed_run_note: 'Timed-run note', project_impact_plan: 'Project impact plan',
  best_timed_run: 'Best timed run', recovery_plan: 'Recovery plan', project_story: 'Project story', skill_to_share: 'Skill to share',
  final_checklist: 'Final checklist', repeatability_check: 'Repeatability check', project_rehearsal: 'Project rehearsal', team_award: 'Team celebration'
};

function futureTaskTitle(key) {
  return futureTaskTitles[key] || String(key).replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function currentWeek() {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const calculated = Math.max(0, Math.floor((date - SEASON_START) / (7 * DAY)));
  // Weeks 3-12 are generated below from the notebook plan, so they must be
  // included when the active week is calculated before those nodes exist.
  const builtWeeks = [...document.querySelectorAll('details[data-homework-week]')].map(node => Number(node.dataset.homeworkWeek)).filter(Number.isFinite);
  const latestBuilt = Math.max(12, builtWeeks.length ? Math.max(...builtWeeks) : 0);
  return Math.min(calculated, latestBuilt);
}

function formatDue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function applyRhythm() {
  const week = currentWeek();
  const week2Detail = document.querySelector('details[data-homework-week="2"]');
  if (week2Detail && !week2Detail.dataset.notebookAligned) {
    week2Detail.dataset.notebookAligned = 'true';
    week2Detail.innerHTML = `<summary class="notebook-title"><div><span>Week 2 · Session 2</span><h3>Build, measure, and map the field</h3></div><strong>Due Wednesday, August 26</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Read the Engineering Notebook</span><h4>Session 2 · build, measure, map</h4><p>Continue the builds from Session 1. Measure the board with a tape measure, record useful landmarks, and see whether a measured distance can be mapped to motor rotations or another repeatable program value.</p><a class="button secondary" href="meeting-02.html">Open Session 2 plan →</a> · <a href="downloads/bioglow/engineering-notebook.pdf" target="_blank" rel="noopener">Open Engineering Notebook ↗</a></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Bring</span><p>Laptop or tablet · pen or pencil · notebook</p></div></section><section class="submission-gate" data-homework-gate="2"><h3>Turn in Week 2</h3><p>Sign in with an approved student account to submit your Session 2 preparation.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="2" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 2 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>What did you build or improve in Session 1, and what will you continue in Session 2?<textarea name="build_progress" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What board distances, landmarks, or boundaries did you measure?<textarea name="board_measurements" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>How could a measured distance connect to motor rotations or another repeatable program value?<textarea name="motor_mapping" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What did your first movement program do well, and what will you test next?<textarea name="program_test" rows="4" minlength="20" maxlength="1600" required></textarea></label><section class="cs2n-homework-question"><span class="eyebrow">CS2N programming</span><h4>Iris Rover: moving forward</h4><p>Complete the coach-provided CS2N lesson and describe what your program did.</p><label>How did your program work?<textarea name="cs2n_reflection" rows="4" minlength="20" maxlength="2000" required></textarea></label><label>Program screenshot (optional)<input name="cs2n_screenshot" type="file" accept="image/jpeg,image/png,image/webp"></label></section><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 2 homework</button><p data-homework-message aria-live="polite"></p></form>`;
  }
  if (week2Detail && !week2Detail.dataset.homeworkOnly) {
    week2Detail.dataset.homeworkOnly = 'true';
    week2Detail.innerHTML = `<summary class="notebook-title"><div><span>Week 2 · Homework</span><h3>Build, measure, and map the field</h3></div><strong>Due Wednesday, August 19</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework questions</span><h4>Show what you observed and what you will test</h4><p>Use your Session 1 work to prepare your own answers. These questions are the homework; practice details and what to bring are in the Sessions tab.</p><ol><li>What did you build or improve in Session 1, and what will you continue?</li><li>What board distances, landmarks, or boundaries did you measure?</li><li>How could a measured distance connect to motor rotations or another repeatable program value?</li><li>What did your first movement program do well, and what will you test next?</li></ol></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Programming</span><h4>CS2N · Iris Rover: moving forward</h4><p>Complete the coach-provided activity, upload one screenshot of your program, and explain how it worked.</p></div></section><footer><span>Connected schedule</span><span><a href="meeting-02.html">Session 2 plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate" data-homework-gate="2"><h3>Turn in Week 2</h3><p>Sign in with an approved student account to submit this homework.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="2" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 2 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>What did you build or improve in Session 1, and what will you continue in Session 2?<textarea name="build_progress" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What board distances, landmarks, or boundaries did you measure?<textarea name="board_measurements" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>How could a measured distance connect to motor rotations or another repeatable program value?<textarea name="motor_mapping" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What did your first movement program do well, and what will you test next?<textarea name="program_test" rows="4" minlength="20" maxlength="1600" required></textarea></label><label>How did your CS2N program work?<textarea name="cs2n_reflection" rows="4" minlength="20" maxlength="2000" required></textarea></label><label>Program screenshot (optional)<input name="cs2n_screenshot" type="file" accept="image/jpeg,image/png,image/webp"></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 2 homework</button><p data-homework-message aria-live="polite"></p></form>`;
  }
  if (week2Detail && week2Detail.dataset.homeworkOnly !== 'team-name') {
    week2Detail.dataset.homeworkOnly = 'team-name';
    week2Detail.innerHTML = `<summary class="notebook-title"><div><span>Week 2 · Homework</span><h3>Choose a team name and a cause anchor</h3></div><strong>Due Wednesday, August 19</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework questions</span><h4>Connect our interests to a shared team direction</h4><p>Bring your own idea. There is no single correct team name or cause.</p><ol><li>What team name are you proposing?</li><li>What biodiversity cause should this name help us investigate?</li><li>Why does this name fit our interests and BIOGLOW?</li><li>What should the team investigate or build next?</li></ol></div></section><footer><span>Connected schedule</span><span><a href="meeting-02.html">Session 2 plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate" data-homework-gate="2"><h3>Turn in Week 2</h3><p>Sign in with an approved student account to submit this homework.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="2" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 2 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>What team name are you proposing?<input name="team_name" maxlength="120" required></label><label>What biodiversity cause should this name help us investigate?<textarea name="cause" rows="5" minlength="40" maxlength="2000" required></textarea></label><label>Why does this name fit our interests and BIOGLOW?<textarea name="reason" rows="5" minlength="40" maxlength="2000" required></textarea></label><label>What should the team investigate or build next?<textarea name="next_step" rows="4" minlength="20" maxlength="1200" required></textarea></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 2 homework</button><p data-homework-message aria-live="polite"></p></form>`;
  }
  // Week 2 has already been published. Keep its original Iris Rover task and
  // submission fields intact even when its card is rebuilt for coach/student views.
  if (week2Detail && !week2Detail.querySelector('[data-week2-cs2n]')) {
    const programming = document.createElement('section');
    programming.className = 'notebook-cell cs2n-homework-question';
    programming.dataset.week2Cs2n = '';
    programming.innerHTML = '<div class="cell-prompt"><span>Programming</span><h4>CS2N · Iris Rover: moving forward</h4><p>Complete Introduction: Iris Rover and Moving Forward, then upload one screenshot of your completed program.</p></div><div class="hero-actions"><a class="button secondary" href="portal.html?tab=robot">Open Robot Lab</a><a class="button secondary" href="https://www.cs2n.org/u/mp/badge_pages/2991" target="_blank" rel="noopener">Open CS2N lesson ↗</a></div>';
    week2Detail.querySelector('footer')?.before(programming);
    const form = week2Detail.querySelector('form[data-homework-form]');
    const files = form?.querySelector('[data-existing-files]');
    if (form && files) {
      const response = document.createElement('section');
      response.className = 'cs2n-homework-question';
      response.dataset.week2Cs2nResponse = '';
      response.innerHTML = '<span class="eyebrow">CS2N programming</span><h4>Iris Rover: moving forward</h4><p>Submit one screenshot of your completed program and a short explanation.</p><label>CS2N program screenshot (optional)<input name="cs2n_screenshot" type="file" accept="image/jpeg,image/png,image/webp"></label><label>How did your program work?<textarea name="cs2n_reflection" rows="4" minlength="20" maxlength="2000" required></textarea></label>';
      files.before(response);
    }
  }
  document.querySelector('[data-homework-week="2"] [data-core-values-activity]')?.remove();
  document.querySelector('[data-homework-week="2"] .worksheet-preview-cell')?.remove();
  const coreValues = ['Discovery', 'Innovation', 'Impact', 'Inclusion', 'Teamwork', 'Fun'];
  const coreIndex = week - 2;
  const scheduledOverride = week === 4 ? ['Fun', 2] : null;
  const coreActivity = scheduledOverride?.[1] ?? (coreIndex >= 0 ? Math.floor(coreIndex / coreValues.length) + 1 : 0);
  const coreValue = scheduledOverride?.[0] ?? (coreIndex >= 0 ? coreValues[coreIndex % coreValues.length] : '');
  const groupOnly = new Set(['innovation-2', 'innovation-3', 'inclusion-1', 'teamwork-2', 'teamwork-3']);
  const coreKey = `${coreValue.toLowerCase()}-${coreActivity}`;
  const coreQuestions = {
    'discovery-1': 'What is one new thing you discovered this week, and what question do you want to investigate next?',
    'innovation-1': 'Describe one creative way our team could solve a biodiversity problem. What would we test first?',
    'impact-1': 'How could our robot, project, or team make a positive impact on biodiversity or our community?',
    'teamwork-1': 'Write each teammate’s name, one thing you think they do well, and one skill or habit they could improve. Be specific and kind.',
    'fun-1': 'Draw something about our team and include everyone if possible. You may draw by hand or digitally and upload the picture.',
    'fun-2': 'Draw something about our team and include everyone if possible. You may draw by hand or digitally and upload the picture.'
  };
  const coreQuestion = coreQuestions[coreKey] || `What did you learn about ${coreValue} this week, and how can our team show it in practice?`;
  const coreLink = document.querySelector('[data-core-values-link]');
  const coreTitle = document.querySelector('[data-core-values-title]');
  const coreNote = document.querySelector('[data-core-values-note]');
  const coreSmall = document.querySelector('[data-core-values-small]');
  let coreQuestionNode = document.querySelector('[data-core-values-question]');
  if (!coreQuestionNode) {
    const prompt = document.querySelector('[data-core-values-activity] .cell-prompt');
    if (prompt) { coreQuestionNode = document.createElement('p'); coreQuestionNode.dataset.coreValuesQuestion = ''; prompt.appendChild(coreQuestionNode); }
  }
  if (coreLink && coreTitle && coreActivity >= 1 && coreActivity <= 3) {
    const slug = coreValue.toLowerCase();
    coreLink.href = coreKey === 'teamwork-1' || coreKey === 'fun-1' ? 'portal.html?tab=homework#core-values-teamwork-1' : `downloads/bioglow/core-values-${slug}-${coreActivity}.pdf`;
    coreTitle.textContent = coreKey === 'teamwork-1' ? 'Teamwork · Activity 1: Team strengths ↗' : coreKey === 'fun-1' ? 'Fun · Activity 1: Team portrait ↗' : `${coreValue} · Activity ${coreActivity} ↗`;
    const teamOnly = groupOnly.has(coreKey);
    coreLink.hidden = true;
    if (coreNote) coreNote.textContent = teamOnly ? 'This page is a group activity and is not assigned as individual homework. The coach will use it during a team practice.' : coreKey === 'teamwork-1' ? 'Write each teammate’s name, what you think they are good at, and one skill or habit they could improve. Be specific and kind.' : coreKey === 'fun-1' ? 'Draw something about your team and include everyone if possible. You can draw by hand, use a digital tool, or upload the finished picture with your homework.' : 'Use this as a team meeting activity; it is shared work rather than individual homework.';
    if (coreSmall) coreSmall.textContent = teamOnly ? 'Team practice only' : coreKey === 'teamwork-1' ? 'Open the team strengths prompt' : coreKey === 'fun-1' ? 'Open the team portrait prompt' : 'Open the one-page activity worksheet';
    if (coreQuestionNode) coreQuestionNode.textContent = teamOnly ? 'This is a group activity for team practice, not individual homework.' : coreQuestion;
  }
  if (!document.querySelector('details[data-homework-week="3"]')) {
    const cs2n = document.querySelector('[data-cs2n-robot-homework]');
    const week3 = document.createElement('details');
    week3.className = 'homework-notebook homework-next homework-week-3';
    week3.dataset.homeworkWeek = '3';
    week3.innerHTML = `<summary class="notebook-title"><div><span>Week 3 · Innovation Project direction</span><h3>Project Sparks and Challenge Story</h3></div><strong>Due Wednesday, August 26</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Read and respond</span><h4>Use the team notebook to choose a problem</h4><p>Read the Project Sparks and Challenge Story pages. Then connect one idea to a biodiversity problem the team can investigate.</p></div><div class="worksheet-preview-grid"><a class="worksheet-preview-card" href="assets/img/notebook/project-sparks.png" target="_blank" rel="noopener"><img src="assets/img/notebook/project-sparks.png" alt="Project Sparks notebook page" loading="lazy"><strong>Project Sparks ↗</strong><small>Click to enlarge</small></a><a class="worksheet-preview-card" href="assets/img/notebook/challenge-story.png" target="_blank" rel="noopener"><img src="assets/img/notebook/challenge-story.png" alt="Challenge Story notebook page" loading="lazy"><strong>Challenge Story ↗</strong><small>Click to enlarge</small></a></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Questions</span><h4>Turn in four short responses</h4><p>Choose a spark, name the problem, identify something to learn from, and bring one useful question to the next session.</p></div></section><footer><span>Connected schedule</span><span><a href="meeting-03.html">Session 3 plan</a> · <a href="meeting-04.html">Session 4 plan</a></span></footer><section class="submission-gate" data-homework-gate="3"><h3>Turn in Week 3</h3><p>Sign in with an approved student account to submit your project direction.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="3" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 3 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>Which Project Spark or different idea interests you most, and why?<textarea name="project_spark" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What biodiversity problem would you like the team to investigate? Who or what is affected?<textarea name="problem_statement" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What existing solution, scientist, organization, or source should we learn from?<textarea name="existing_solution" rows="5" minlength="20" maxlength="2000" required></textarea></label><label>What is one question we should bring to Session 3 or Session 4?<textarea name="next_question" rows="4" minlength="20" maxlength="1600" required></textarea></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 3 homework</button><p data-homework-message aria-live="polite"></p></form>`;
    if (cs2n) cs2n.before(week3); else document.querySelector('[data-panel="homework"]')?.append(week3);
  }
  const week3Detail = document.querySelector('details[data-homework-week="3"]');
  if (week3Detail && !week3Detail.dataset.homeworkOnly) {
    week3Detail.dataset.homeworkOnly = 'true';
    week3Detail.innerHTML = `<summary class="notebook-title"><div><span>Week 3 · Homework</span><h3>Project Sparks and Challenge Story</h3></div><strong>Due Wednesday, August 26</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework questions</span><h4>Choose a problem worth investigating</h4><p>Read Project Sparks and Challenge Story, then use the questions below to turn one idea into a clear biodiversity project direction.</p><ol><li>Which Project Spark or different idea interests you most, and why?</li><li>What biodiversity problem would you like the team to investigate? Who or what is affected?</li><li>What existing solution, scientist, organization, or source should we learn from?</li><li>What is one question to bring to Session 3?</li><li><strong>Core Values · Discovery:</strong> What is one new thing you discovered this week, and what question do you want to investigate next?</li></ol></div><div class="worksheet-preview-grid"><a class="worksheet-preview-card" href="assets/img/notebook/project-sparks.png" target="_blank" rel="noopener"><img src="assets/img/notebook/project-sparks.png" alt="Project Sparks notebook page" loading="lazy"><strong>Project Sparks ↗</strong><small>Click to enlarge</small></a><a class="worksheet-preview-card" href="assets/img/notebook/challenge-story.png" target="_blank" rel="noopener"><img src="assets/img/notebook/challenge-story.png" alt="Challenge Story notebook page" loading="lazy"><strong>Challenge Story ↗</strong><small>Click to enlarge</small></a></div></section><footer><span>Connected schedule</span><span><a href="meeting-03.html">Session 3 plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate" data-homework-gate="3"><h3>Turn in Week 3</h3><p>Sign in with an approved student account to submit this homework.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="3" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 3 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>Which Project Spark or different idea interests you most, and why?<textarea name="project_spark" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What biodiversity problem would you like the team to investigate? Who or what is affected?<textarea name="problem_statement" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What existing solution, scientist, organization, or source should we learn from?<textarea name="existing_solution" rows="5" minlength="20" maxlength="2000" required></textarea></label><label>What is one question you should bring to Session 3?<textarea name="next_question" rows="4" minlength="20" maxlength="1600" required></textarea></label><label data-core-values-response>Core Values · Discovery Activity 1<textarea name="core_values_response" rows="5" minlength="20" maxlength="2000" required></textarea></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 3 homework</button><p data-homework-message aria-live="polite"></p></form>`;
  }
  // Week 3 follows the work completed in Session 2. The Discovery task comes
  // from page 3 of the Core Values activity book.
  if (week3Detail) {
    const sessionQuestions = [
      ['project_sparks_summary', 'Read the Project Sparks page. In your own words, what does it say and what idea from the page could help a team begin an Innovation Project?'],
      ['challenge_story_summary', 'Read the Challenge Story page. In your own words, what is the challenge story asking teams to notice, explore, or improve?'],
      ['model_build', 'What model did you build, improve, or observe in Session 2? Rewatch the Robot Game Missions video, then explain in your own words how the model works and what kind of attachment could help a robot complete it. You may draw your idea and upload a photo. Be ready to explain it in class.'],
      ['model_purpose', 'Mission name and Spark connection — our team name is Habitat Builders. Choose an interest angle that matters to you, such as invasive species, rainforest protection, or another biodiversity idea. How could Habitat Builders investigate or build something that helps?']
    ];
    const weekHeading = week3Detail.querySelector('summary h3');
    const promptHeading = week3Detail.querySelector('.cell-prompt h4');
    const promptText = week3Detail.querySelector('.cell-prompt p');
    if (weekHeading) weekHeading.textContent = 'Model build and Habitat Builders connection';
    if (promptHeading) promptHeading.textContent = 'Use what we did in Session 2';
    if (promptText) promptText.textContent = 'Think back to the Session 2 models and connect your own biodiversity interest to our Habitat Builders team name. Field measurements move to next week.';
    const taskList = week3Detail.querySelector('.cell-prompt ol');
    if (taskList) taskList.innerHTML = `${sessionQuestions.map(([, prompt]) => `<li>${prompt}</li>`).join('')}<li><strong>Core Values · Discovery Activity 1:</strong> Find out how many countries have FIRST LEGO League teams. Choose at least three countries and learn how to say “hello” and “My name is...” in languages spoken there.</li>`;
    const prompt = week3Detail.querySelector('.cell-prompt');
    if (prompt && !prompt.querySelector('[data-model-video-link]')) prompt.insertAdjacentHTML('beforeend', '<div class="notebook-downloads"><a data-model-video-link href="https://www.youtube.com/watch?v=uhZZ8O1StiQ" target="_blank" rel="noopener"><strong>Rewatch Robot Game Missions video ↗</strong><small>Observe how the mission models work</small></a><a data-discovery-link href="downloads/bioglow/core-values-discovery-1.pdf#page=3" target="_blank" rel="noopener"><strong>Discovery Activity 1 · page 3 ↗</strong><small>Open the Core Values activity book</small></a></div>');
    const form = week3Detail.querySelector('form[data-homework-form]');
    const responseHeader = form?.querySelector('.section-title')?.outerHTML;
    const sketchUpload = '<label>Optional model sketch or drawing<input name="files" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label>';
    if (form && responseHeader) form.innerHTML = `${responseHeader}${sessionQuestions.map(([key, prompt]) => `<label>${prompt}<textarea name="${key}" rows="5" minlength="30" maxlength="2000" required></textarea></label>`).join('')}${sketchUpload}<label>Core Values · Discovery Activity 1 — FIRST LEGO League around the world<textarea name="core_values_discovery" rows="6" minlength="40" maxlength="2000" required></textarea></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 3 homework</button><p data-homework-message aria-live="polite"></p>`;
  }

  Object.entries(notebookHomework).forEach(([weekNumber, assignment]) => {
    if (document.querySelector(`details[data-homework-week="${weekNumber}"]`)) return;
    const detail = document.createElement('details');
    detail.className = 'homework-notebook homework-next';
    detail.dataset.homeworkWeek = weekNumber;
    const coreQuestion = assignment.questions.find(([key]) => key.startsWith('core_'));
    const contentQuestions = assignment.questions.filter(([key]) => !key.startsWith('core_'));
    const fields = assignment.questions.map(([key, prompt], index) => `<label><span>Task ${index + 1} · ${futureTaskTitle(key)}</span>${prompt}<textarea name="${key}" rows="4" minlength="20" maxlength="2000" required></textarea></label>`).join('');
    const taskCells = contentQuestions.map(([key, prompt], index) => `<section class="notebook-cell"><div class="cell-prompt"><span>Task ${index + 1}</span><h4>${futureTaskTitle(key)}</h4><p>${prompt}</p></div></section>`).join('');
    const coreActivity = assignment.core ? `<section class="notebook-cell"><div class="cell-prompt"><span>Task ${contentQuestions.length + 1} · Core Values</span><h4>${assignment.core.label}</h4><p>${coreQuestion?.[1] || assignment.core.task}</p></div><div class="notebook-downloads"><a href="${assignment.core.href}" target="_blank" rel="noopener"><strong>Open ${assignment.core.label} ↗</strong><small>Official Core Values activity book</small></a></div></section>` : '';
    detail.innerHTML = `<summary class="notebook-title"><div><span>Week ${weekNumber} · Homework</span><h3>${assignment.title}</h3></div><strong>Due ${fallbackAssignments[weekNumber].due}</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework plan</span><h4>Reflect on Session ${assignment.reflects || weekNumber - 1}; prepare for Session ${assignment.session}</h4><p>Each task below is part of this homework. The robot track builds toward reliable points and timing; the project track stays connected to the team name, biodiversity cause, and next useful step.</p></div></section>${taskCells}${coreActivity}<footer><span>Connected schedule</span><span><a href="${assignment.link}">Session ${assignment.session} plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate" data-homework-gate="${weekNumber}"><h3>Turn in Week ${weekNumber}</h3><p>Sign in with an approved student account to submit this homework.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="${weekNumber}" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week ${weekNumber} submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div>${fields}<div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week ${weekNumber} homework</button><p data-homework-message aria-live="polite"></p></form>`;
    document.querySelector('[data-cs2n-robot-homework]')?.before(detail) || document.querySelector('[data-panel="homework"]')?.append(detail);
  });
  const assignments = { ...fallbackAssignments };
  document.body.dataset.currentHomeworkWeek = String(week);

  const details = [...document.querySelectorAll('details[data-homework-week]')];
  details.forEach(detail => {
    const number = Number(detail.dataset.homeworkWeek);
    const active = number === week;
    detail.classList.toggle('homework-current', active);
    detail.classList.toggle('homework-past', number < week);
    detail.classList.toggle('homework-future', number > week);
    detail.open = active;
    const summary = detail.querySelector('summary');
    const label = summary?.querySelector('span');
    const due = summary?.querySelector('strong');
    const heading = summary?.querySelector('h3');
    const assignment = assignments[number];
    if (assignment && heading) heading.textContent = assignment.title;
    if (assignment && due) due.textContent = `Due ${assignment.due}`;
    const displayWeek = number;
    if (label) label.textContent = `Week ${displayWeek} · ${active ? 'This week' : number < week ? 'Previous week' : 'Next week'}`;
    const gateHeading = detail.querySelector('[data-homework-gate] h3');
    if (gateHeading) gateHeading.textContent = `Turn in Week ${displayWeek}`;
  });

  const current = assignments[week] || assignments[Math.max(...Object.keys(assignments).map(Number))];
  const next = assignments[week + 1];
  const setText = (selector, value) => { const node = document.querySelector(selector); if (node && value) node.textContent = value; };
  setText('#dashboard-current-assignment', current.title);
  setText('#dashboard-current-due', current.due);
  setText('#dashboard-priorities', current.priority);
  setText('#dashboard-next-assignment', next?.title || 'Next assignment will appear when it is published.');
  setText('#dashboard-next-due', next?.due || 'To be announced');
  setText('[data-homework-rhythm-label]', `Week ${week} · This week`);
  setText('[data-homework-rhythm-status]', `Week ${week} is active now; the next week opens automatically on Sunday.`);
  renderNotebookProgress();
  document.dispatchEvent(new Event('fireflies:homework-cards-ready'));
}

async function renderNotebookProgress() {
  const sessions = document.querySelector('[data-panel="sessions"]');
  const host = document.querySelector('#coach-session-queue-host');
  if (!sessions || !host || sessions.querySelector('[data-notebook-progress]')) return;
  const section = document.createElement('section');
  section.className = 'callout notebook-progress';
  section.dataset.notebookProgress = '';
  section.innerHTML = '<div class="section-title"><div><span class="eyebrow">Engineering Notebook</span><h3>Session progress</h3></div><span class="status-chip" data-notebook-progress-status>Loading…</span></div><p class="muted">The notebook sessions below are the same sessions in our schedule. A session becomes complete when its shared checklist is finished.</p><div class="notebook-session-list" data-notebook-session-list></div>';
  host.prepend(section);
  const names = ['Field and Robot Baseline','Mission Science and Project Leads','First Reliable Missions','Dock Strategy and Keystone Species','Left Field and Seed Behavior','Problem Evidence and Expert Plan','Right Field Mechanisms','Project Decision and First Prototype','Match Strategy and Project Impact','Presentation Draft and Timed Match','Final Presentations and Robot Design','Full Event Rehearsal'];
  const list = section.querySelector('[data-notebook-session-list]');
  list.innerHTML = names.map((name,index) => `<a class="notebook-session-row" href="meeting-${String(index+1).padStart(2,'0')}.html"><strong>Session ${index+1}</strong><span>${name}</span><em data-notebook-session-status="${index+1}">Not recorded</em></a>`).join('');
  const cfg = window.FIREFLIES_PORTAL_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { section.querySelector('[data-notebook-progress-status]').textContent = 'Shared checklist'; return; }
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const db = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const { data: { session } } = await db.auth.getSession();
    if (!session) { section.remove(); return; }
    const { data: profile } = await db.from('profiles').select('role,approval_status').eq('id', session.user.id).maybeSingle();
    if (profile?.approval_status !== 'approved' || !['coach','student_coach'].includes(profile.role)) { section.remove(); return; }
    const { data: items, error } = await db.from('schedule_items').select('session_key,completed').like('session_key','meeting-%');
    if (error) throw error;
    const grouped = {};
    (items || []).forEach(item => { (grouped[item.session_key] ||= []).push(item); });
    let completed = 0;
    names.forEach((_,index) => {
      const key = `meeting-${String(index+1).padStart(2,'0')}`;
      const rows = grouped[key] || [];
      const done = rows.length > 0 && rows.every(row => row.completed);
      const status = section.querySelector(`[data-notebook-session-status="${index+1}"]`);
      if (done) { completed += 1; status.textContent = 'Completed'; status.classList.add('is-complete'); }
      else if (rows.some(row => row.completed)) status.textContent = 'In progress';
      else status.textContent = 'Not started';
    });
    section.querySelector('[data-notebook-progress-status]').textContent = `${completed} of ${names.length} complete`;
  } catch (error) {
    section.querySelector('[data-notebook-progress-status]').textContent = 'Shared checklist unavailable';
    window.FIREFLIES_DIAGNOSTICS?.report('Notebook session progress', error);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyRhythm, { once: true });
else applyRhythm();
