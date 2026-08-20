// Keep the visible homework rhythm tied to the season calendar.  The team season
// starts on Sunday, August 2, 2026, so the active week changes at local midnight
// each Sunday without requiring a content edit or deployment.
const SEASON_START = new Date(2026, 7, 2);
const DAY = 24 * 60 * 60 * 1000;

const fallbackAssignments = {
  0: { title: 'Explore biodiversity and understand the game', due: 'Wednesday, August 5', priority: 'Finish the biodiversity paragraph and bring one rules question to Session 1.' },
  1: { title: 'Field and robot baseline', due: 'Wednesday, August 12', priority: 'Use the notebook to prepare for Session 1: establish the field baseline, build a first mechanism, and test a simple movement.' },
  2: { title: 'Choose a team name and a cause anchor', due: 'Wednesday, August 19', priority: 'Connect our biodiversity interests to a team name, a cause, and one question we can investigate together.' },
  3: { title: 'Session 2 build, field map, and robot movement', due: 'Wednesday, August 26', priority: 'Reflect on the models, board measurements, and robot movement from Session 2, then complete Discovery Activity 1.' },
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
    week2Detail.innerHTML = `<summary class="notebook-title"><div><span>Week 2 · Session 2</span><h3>Build, measure, and map the field</h3></div><strong>Due Wednesday, August 26</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Read the Engineering Notebook</span><h4>Session 2 · build, measure, map</h4><p>Continue the builds from Session 1. Measure the board with a tape measure, record useful landmarks, and see whether a measured distance can be mapped to motor rotations or another repeatable program value.</p><a class="button secondary" href="meeting-02.html">Open Session 2 plan →</a> · <a href="downloads/bioglow/engineering-notebook.pdf" target="_blank" rel="noopener">Open Engineering Notebook ↗</a></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Bring</span><p>Laptop or tablet · pen or pencil · notebook</p></div></section><section class="submission-gate" data-homework-gate="2"><h3>Turn in Week 2</h3><p>Sign in with an approved student account to submit your Session 2 preparation.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="2" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 2 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>What did you build or improve in Session 1, and what will you continue in Session 2?<textarea name="build_progress" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What board distances, landmarks, or boundaries did you measure?<textarea name="board_measurements" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>How could a measured distance connect to motor rotations or another repeatable program value?<textarea name="motor_mapping" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What did your first movement program do well, and what will you test next?<textarea name="program_test" rows="4" minlength="20" maxlength="1600" required></textarea></label><section class="cs2n-homework-question"><span class="eyebrow">CS2N programming</span><h4>Iris Rover: moving forward</h4><p>Complete the coach-provided CS2N lesson and describe what your program did.</p><label>How did your program work?<textarea name="cs2n_reflection" rows="4" minlength="20" maxlength="2000" required></textarea></label><label>Program screenshot<input name="cs2n_screenshot" type="file" accept="image/jpeg,image/png,image/webp" required></label></section><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 2 homework</button><p data-homework-message aria-live="polite"></p></form>`;
  }
  if (week2Detail && !week2Detail.dataset.homeworkOnly) {
    week2Detail.dataset.homeworkOnly = 'true';
    week2Detail.innerHTML = `<summary class="notebook-title"><div><span>Week 2 · Homework</span><h3>Build, measure, and map the field</h3></div><strong>Due Wednesday, August 19</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework questions</span><h4>Show what you observed and what you will test</h4><p>Use your Session 1 work to prepare your own answers. These questions are the homework; practice details and what to bring are in the Sessions tab.</p><ol><li>What did you build or improve in Session 1, and what will you continue?</li><li>What board distances, landmarks, or boundaries did you measure?</li><li>How could a measured distance connect to motor rotations or another repeatable program value?</li><li>What did your first movement program do well, and what will you test next?</li></ol></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Programming</span><h4>CS2N · Iris Rover: moving forward</h4><p>Complete the coach-provided activity, upload one screenshot of your program, and explain how it worked.</p></div></section><footer><span>Connected schedule</span><span><a href="meeting-02.html">Session 2 plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate" data-homework-gate="2"><h3>Turn in Week 2</h3><p>Sign in with an approved student account to submit this homework.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="2" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 2 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>What did you build or improve in Session 1, and what will you continue in Session 2?<textarea name="build_progress" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What board distances, landmarks, or boundaries did you measure?<textarea name="board_measurements" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>How could a measured distance connect to motor rotations or another repeatable program value?<textarea name="motor_mapping" rows="5" minlength="30" maxlength="2000" required></textarea></label><label>What did your first movement program do well, and what will you test next?<textarea name="program_test" rows="4" minlength="20" maxlength="1600" required></textarea></label><label>How did your CS2N program work?<textarea name="cs2n_reflection" rows="4" minlength="20" maxlength="2000" required></textarea></label><label>Program screenshot<input name="cs2n_screenshot" type="file" accept="image/jpeg,image/png,image/webp" required></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 2 homework</button><p data-homework-message aria-live="polite"></p></form>`;
  }
  if (week2Detail && week2Detail.dataset.homeworkOnly !== 'team-name') {
    week2Detail.dataset.homeworkOnly = 'team-name';
    week2Detail.innerHTML = `<summary class="notebook-title"><div><span>Week 2 · Homework</span><h3>Choose a team name and a cause anchor</h3></div><strong>Due Wednesday, August 19</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework questions</span><h4>Connect our interests to a shared team direction</h4><p>Bring your own idea. There is no single correct team name or cause.</p><ol><li>What team name are you proposing?</li><li>What biodiversity cause should this name help us investigate?</li><li>Why does this name fit our interests and BIOGLOW?</li><li>What should the team investigate or build next?</li></ol></div></section><footer><span>Connected schedule</span><span><a href="meeting-02.html">Session 2 plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate" data-homework-gate="2"><h3>Turn in Week 2</h3><p>Sign in with an approved student account to submit this homework.</p><a class="button primary" href="login.html">Sign in</a></section><form class="homework-submit notebook-response" data-homework-form data-week-number="2" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week 2 submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div><label>What team name are you proposing?<input name="team_name" maxlength="120" required></label><label>What biodiversity cause should this name help us investigate?<textarea name="cause" rows="5" minlength="40" maxlength="2000" required></textarea></label><label>Why does this name fit our interests and BIOGLOW?<textarea name="reason" rows="5" minlength="40" maxlength="2000" required></textarea></label><label>What should the team investigate or build next?<textarea name="next_step" rows="4" minlength="20" maxlength="1200" required></textarea></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 2 homework</button><p data-homework-message aria-live="polite"></p></form>`;
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
      ['model_build', 'Which numbered model did you help build, improve, or observe in Session 2 (Model 5, 6, 7, or 1)? Describe what it is meant to do and one detail you noticed.'],
      ['model_purpose', 'Rewatch the Robot Game Missions video. Choose one mission model and explain in your own words how it works, what it represents, and how it connects to a Project Spark.'],
      ['board_measurements', 'Record two board measurements from Session 2. Name the start and end landmarks for each measurement, and explain how one measurement could help a robot run.'],
      ['robot_maneuver', 'Describe one robot movement or maneuver your group tried. What did it do, what worked or did not work, and what is one change you would test next?']
    ];
    const weekHeading = week3Detail.querySelector('summary h3');
    const promptHeading = week3Detail.querySelector('.cell-prompt h4');
    const promptText = week3Detail.querySelector('.cell-prompt p');
    if (weekHeading) weekHeading.textContent = 'Session 2 build, field map, and robot movement';
    if (promptHeading) promptHeading.textContent = 'Use what we did in Session 2';
    if (promptText) promptText.textContent = 'Think back to the models, field measurements, and robot movement from Session 2. These are observations from our own work, not extra research questions.';
    const taskList = week3Detail.querySelector('.cell-prompt ol');
    if (taskList) taskList.innerHTML = `${sessionQuestions.map(([, prompt]) => `<li>${prompt}</li>`).join('')}<li><strong>Core Values · Discovery Activity 1:</strong> Find out how many countries have FIRST LEGO League teams. Choose at least three countries and learn how to say “hello” and “My name is...” in languages spoken there.</li>`;
    const prompt = week3Detail.querySelector('.cell-prompt');
    if (prompt && !prompt.querySelector('[data-model-video-link]')) prompt.insertAdjacentHTML('beforeend', '<div class="notebook-downloads"><a data-model-video-link href="https://www.youtube.com/watch?v=uhZZ8O1StiQ" target="_blank" rel="noopener"><strong>Rewatch Robot Game Missions video ↗</strong><small>Observe how the mission models work</small></a><a data-discovery-link href="downloads/bioglow/core-values-discovery-1.pdf#page=3" target="_blank" rel="noopener"><strong>Discovery Activity 1 · page 3 ↗</strong><small>Open the Core Values activity book</small></a></div>');
    const form = week3Detail.querySelector('form[data-homework-form]');
    const responseHeader = form?.querySelector('.section-title')?.outerHTML;
    if (form && responseHeader) form.innerHTML = `${responseHeader}${sessionQuestions.map(([key, prompt]) => `<label>${prompt}<textarea name="${key}" rows="5" minlength="30" maxlength="2000" required></textarea></label>`).join('')}<label>Core Values · Discovery Activity 1 — FIRST LEGO League around the world<textarea name="core_values_discovery" rows="6" minlength="40" maxlength="2000" required></textarea></label><div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week 3 homework</button><p data-homework-message aria-live="polite"></p>`;
  }

  Object.entries(notebookHomework).forEach(([weekNumber, assignment]) => {
    if (document.querySelector(`details[data-homework-week="${weekNumber}"]`)) return;
    const detail = document.createElement('details');
    detail.className = 'homework-notebook homework-next';
    detail.dataset.homeworkWeek = weekNumber;
    const fields = assignment.questions.map(([key, prompt]) => `<label>${prompt}<textarea name="${key}" rows="4" minlength="20" maxlength="2000" required></textarea></label>`).join('');
    const questionList = assignment.questions.map(([, prompt]) => `<li>${prompt}</li>`).join('');
    detail.innerHTML = `<summary class="notebook-title"><div><span>Week ${weekNumber} · Homework</span><h3>${assignment.title}</h3></div><strong>Due ${fallbackAssignments[weekNumber].due}</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework questions</span><h4>${assignment.title}</h4><p>Use the matching Engineering Notebook session to prepare your own responses.</p><ol>${questionList}</ol></div></section><footer><span>Connected schedule</span><span><a href="${assignment.link}">Session ${assignment.session} plan</a> · <a href="resources.html">Official resources</a></span></footer><form class="homework-submit notebook-response" data-homework-form data-week-number="${weekNumber}" hidden><div class="section-title"><div><span class="eyebrow">Your response</span><h3>Week ${weekNumber} submission</h3></div><span class="status-chip" data-submit-status>Not submitted</span></div>${fields}<div data-existing-files class="submission-files"></div><button class="button primary" type="submit">Submit Week ${weekNumber} homework</button><p data-homework-message aria-live="polite"></p></form>`;
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
