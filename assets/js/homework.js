const cfg = window.FIREFLIES_PORTAL_CONFIG || {};
const forms = [...document.querySelectorAll('[data-homework-form]')];
const gates = [...document.querySelectorAll('[data-homework-gate]')];
const homeworkDetails = [...document.querySelectorAll('details[data-homework-week]')];
const coachQueue = document.querySelector('#coach-session-queue');
const coachSessionsTab = document.querySelector('[data-tab="sessions"]');
const coachQueueHost = document.querySelector('#coach-session-queue-host');
const markdown = value => window.FIREFLIES_MARKDOWN?.render(value) || `<p>${esc(value)}</p>`;

if (!forms.length) {
  // The page may be opened on a section that does not contain assignments.
} else if (cfg.forceDemo || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
  gates.forEach(gate => { gate.innerHTML = '<p>Homework is unavailable right now.</p>'; });
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    // The default gate copy already explains the sign-in action.
  } else {
    const { data: profile } = await db.from('profiles').select('id,email,is_admin,role,approval_status,linked_student_id').eq('id', session.user.id).maybeSingle();
    await configureHomeworkView(profile, db);
    await applyHomeworkPublication(db, profile);
    for (const form of forms) {
      const week = Number(form.dataset.weekNumber);
      const gate = document.querySelector(`[data-homework-gate="${week}"]`);
      if (profile?.approval_status === 'approved' && profile.role === 'student') {
        await openStudentForm(db, session.user.id, form, gate, week);
      } else if (gate && profile?.approval_status === 'approved' && profile.role === 'parent') {
        await openParentSubmission(db, profile.linked_student_id, gate, week);
      } else if (gate && profile?.approval_status === 'approved' && ['coach', 'student_coach'].includes(profile.role)) {
        gate.innerHTML = '<h2>Coach review</h2><p>View every student and submission in the homework review workspace.</p><a class="button primary" href="admin-homework.html">Open homework review</a>';
      } else if (gate && session) {
        gate.innerHTML = '<h2>Account approval required</h2><p>You are signed in. A coach must approve this account before homework is available.</p>';
      }
    }
    // The rhythm module may add future-week details after this module starts;
    // run the publication filter once more after the DOM settles.
    setTimeout(() => applyHomeworkPublication(db, profile), 0);
    document.addEventListener('fireflies:homework-cards-ready', () => {
      if (profile?.approval_status === 'approved' && ['coach', 'student_coach'].includes(profile.role)) renderCoachHomeworkControls(db, profile);
    });
  }
}

async function applyHomeworkPublication(db, profile) {
  const approved = profile?.approval_status === 'approved';
  const isCoach = approved && ['coach', 'student_coach'].includes(profile.role);
  if (isCoach) return;
  const { data: assignments, error } = await db.from('assignments').select('week_number,published').order('week_number');
  const publishedWeeks = new Set((assignments || []).filter(item => item.published).map(item => Number(item.week_number)));
  // If the publication check is unavailable, keep future work private rather
  // than briefly exposing the entire season to a student or parent.
  document.querySelectorAll('details[data-homework-week]').forEach(detail => {
    const week = Number(detail.dataset.homeworkWeek);
    detail.hidden = error ? week > 2 : !publishedWeeks.has(week);
  });
}

async function openParentSubmission(db, studentId, gate, week) {
  if (!studentId) {
    gate.innerHTML = '<h2>Student link needed</h2><p>Your account is not linked to a student yet. Ask a coach to connect your account on the Team page.</p>';
    return;
  }
  const { data: assignment, error: assignmentError } = await db.from('assignments').select('id,title').eq('week_number', week).eq('published', true).maybeSingle();
  if (assignmentError || !assignment) { gate.innerHTML = '<p>Homework is unavailable right now.</p>'; return; }
  const [{ data: submission, error: submissionError }, { data: questions, error: questionsError }] = await Promise.all([
    db.from('submissions').select('id,status,submitted_at,coach_feedback,submission_answers(question_key,display_order,answer_text),submission_files(id,file_name,storage_path,mime_type,size_bytes)').eq('assignment_id', assignment.id).eq('student_id', studentId).maybeSingle(),
    db.from('assignment_questions').select('question_key,prompt').eq('assignment_id', assignment.id)
  ]);
  if (submissionError || questionsError) { window.FIREFLIES_DIAGNOSTICS?.report('Parent homework view', submissionError || questionsError); gate.innerHTML = '<p>Your child’s homework is unavailable right now.</p>'; return; }
  if (!submission) { gate.innerHTML = `<h2>${esc(assignment.title)}</h2><p>Your child has not submitted this homework yet.</p>`; return; }
  const questionMap = new Map((questions || []).map(question => [question.question_key, question.prompt]));
  const answers = (submission.submission_answers || []).sort((a, b) => a.display_order - b.display_order).map(answer => `<article class="answer-card"><h4>${esc(questionMap.get(answer.question_key) || questionLabel(answer.question_key))}</h4><div class="markdown-content">${markdown(answer.answer_text || 'No response yet.')}</div></article>`).join('');
  const files = await Promise.all(distinctSubmissionFiles(submission.submission_files).map(async file => {
    const { data } = await db.storage.from('homework-files').createSignedUrl(file.storage_path, 900);
    const open = data?.signedUrl ? `<a href="${esc(data.signedUrl)}" target="_blank" rel="noopener">${esc(file.file_name)}</a>` : `<span>${esc(file.file_name)}</span>`;
    return `<span class="file-chip managed-file">${open}<button type="button" class="remove-file" data-remove-file="${file.id}" data-storage-path="${esc(file.storage_path)}" title="Remove attachment" aria-label="Remove ${esc(file.file_name)}">×</button></span>`;
  }));
  gate.innerHTML = `<div class="section-title"><div><span class="eyebrow">Linked student submission</span><h2>${esc(assignment.title)}</h2></div><span class="status-chip">${esc(submission.status || 'Submitted')}</span></div><p class="muted">Submitted ${submission.submitted_at ? esc(new Date(submission.submitted_at).toLocaleString()) : 'recently'}.</p><div class="parent-submission">${answers || '<p>No written responses yet.</p>'}${files.length ? `<div class="submission-files">${files.join('')}</div>` : ''}${submission.coach_feedback ? `<article class="coach-feedback"><h3>Coach feedback</h3><div class="markdown-content">${markdown(submission.coach_feedback)}</div></article>` : ''}</div>`;
  gate.querySelectorAll('[data-remove-file]').forEach(button => {
    button.onclick = async () => {
      if (!confirm('Remove this attachment?')) return;
      const target = (submission.submission_files || []).find(file => file.id === button.dataset.removeFile);
      const removed = target && await removeMatchingAttachments(db, submission.submission_files, target);
      if (!removed) return;
      await openParentSubmission(db, studentId, gate, week);
    };
  });
}

function questionLabel(key) {
  return ({ topic: 'Chosen topic', paragraph: 'What interests your child', sources: 'Sources or links', three_parts: 'The three parts of FLL Challenge', biodiversity_question: 'Biodiversity question', core_value: 'Core Value', session1_plan: 'Session 1 plan', team_name: 'Proposed team name', cause: 'Biodiversity cause', reason: 'Why this name fits', next_step: 'Next step', cs2n_reflection: 'How the CS2N program worked', build_progress: 'Build progress', project_sparks_summary: 'Project Sparks in the student’s own words', challenge_story_summary: 'Challenge Story in the student’s own words', model_build: 'Session 2 model build', model_purpose: 'Model purpose and robot interaction', board_measurements: 'Board measurements', robot_maneuver: 'Robot maneuver and next test', motor_mapping: 'Motor rotation mapping', program_test: 'Movement program test', project_spark: 'Project Spark', problem_statement: 'Biodiversity problem', existing_solution: 'Existing solution or source', next_question: 'Next question', core_values_discovery: 'Core Values · Discovery Activity 1', source: 'Research source', choice: 'New or existing solution', expert_question: 'Expert or user question', solution_plan: 'Solution plan', steps: 'Planned steps and limits', pseudocode: 'Pseudocode', mission_test: 'Mission test', prototype: 'Prototype', evidence: 'Impact evidence', test_result: 'Test result', next_change: 'Next change', feedback_source: 'Feedback source', useful_feedback: 'Useful feedback', revision: 'Revision', robot_iteration: 'Robot iteration', intended_impact: 'Intended impact', mission_strategy: 'Mission strategy', reliability: 'Reliability evidence', next_improvement: 'Next improvement', story_outline: 'Presentation story', coopertition: 'Coopertition example', contribution: 'Presentation contribution', base_robot: 'Base robot design', attachment_code: 'Attachment or code', test_revision: 'Test and revision', team_fun: 'Team fun', presentation_reflection: 'Presentation reflection', weakest_section: 'Section to rehearse', recovery_plan: 'Recovery plan', coach_question: 'Question for the coach', biggest_learning: 'Biggest learning', remaining_risk: 'Remaining risk', packing: 'Readiness checklist', team_goal: 'Team goal' })[key] || key.replace(/_/g, ' ');
}

// Remove the initial paint guard only after the role/session check has finished.
// This prevents a coach from seeing student homework flash briefly on refresh.
document.body.removeAttribute('data-homework-auth-loading');

async function configureHomeworkView(profile, db) {
  const approved = profile?.approval_status === 'approved';
  const isCoach = approved && ['coach', 'student_coach'].includes(profile.role);
  if (isCoach) {
    // Coaches can read the complete assignment before and after publication;
    // only student submission forms remain unavailable to them.
    homeworkDetails.forEach(detail => { detail.hidden = false; detail.open = detail.classList.contains('homework-current'); });
    renderCoachWeekTwoCard();
    renderCoachWeekThreeCard();
    // The homework rhythm module creates Week 3 dynamically. Re-check after
    // its initial DOM work so the coach version is reliable on every load.
    setTimeout(renderCoachWeekThreeCard, 0);
    if (coachSessionsTab) coachSessionsTab.hidden = false;
    if (coachQueue && coachQueueHost) coachQueueHost.append(coachQueue);
    if (coachQueue) await renderCoachSessionFocus(db, coachQueue);
    await renderCoachHomeworkControls(db, profile);
    setTimeout(() => renderCoachHomeworkControls(db, profile), 0);
  }
}

async function renderCoachHomeworkControls(db, profile) {
  const canSend = profile?.role === 'coach' && (profile.is_admin || profile.email?.toLowerCase() === 'sriram87@gmail.com');
  const { data: assignments, error } = await db.from('assignments').select('week_number,published').order('week_number');
  if (error) return;
  const statusByWeek = new Map((assignments || []).map(assignment => [Number(assignment.week_number), Boolean(assignment.published)]));
  document.querySelectorAll('details[data-homework-week]').forEach(detail => {
    const week = Number(detail.dataset.homeworkWeek);
    const summary = detail.querySelector(':scope > summary');
    const heading = summary?.querySelector(':scope > div');
    if (!summary || !heading || !Number.isFinite(week)) return;
    let status = heading.querySelector('[data-homework-publication-status]');
    if (!status) {
      status = document.createElement('small');
      status.dataset.homeworkPublicationStatus = '';
      status.className = 'homework-publication-status';
      heading.querySelector('span')?.after(status);
    }
    status.textContent = statusByWeek.get(week) ? 'Published' : 'Unpublished';
    status.classList.toggle('is-published', statusByWeek.get(week) === true);
    if (!canSend) {
      summary.querySelector('em')?.remove();
      return;
    }
    let controls = summary.querySelector('[data-homework-mail-controls]');
    if (!controls) {
      summary.querySelector('em')?.remove();
      controls = document.createElement('span');
      controls.dataset.homeworkMailControls = '';
      controls.className = 'homework-mail-controls';
      summary.append(controls);
    }
    const isPublished = statusByWeek.get(week) === true;
    controls.innerHTML = `<a href="#" data-preview-homework="${week}">Preview Homework</a><a href="#" data-post-homework="${week}">${isPublished ? 'Send reminder' : 'Post Homework'}</a><span class="form-message" data-homework-mail-message></span>`;
    controls.querySelector('[data-preview-homework]')?.addEventListener('click', event => {
      event.preventDefault();
      sendCoachHomeworkEmail(db, week, false, controls, status);
    });
    controls.querySelector('[data-post-homework]')?.addEventListener('click', event => {
      event.preventDefault();
      sendCoachHomeworkEmail(db, week, true, controls, status, isPublished);
    });
  });
}

async function sendCoachHomeworkEmail(db, week, deliverToTeam, controls, status, isReminder = false) {
  const action = isReminder ? 'Send a reminder for' : 'Post';
  if (deliverToTeam && !confirm(`${action} Week ${week} homework and email all approved students, parents, and coaches?`)) return;
  const message = controls.querySelector('[data-homework-mail-message]');
  const link = controls.querySelector(deliverToTeam ? '[data-post-homework]' : '[data-preview-homework]');
  if (link) link.textContent = 'Sending…';
  if (message) message.textContent = '';
  const { data, error } = await db.functions.invoke('gmail-send-test', { body: { kind: 'current', weekNumber: week, deliverToTeam, reminder: isReminder } });
  if (link) link.textContent = deliverToTeam ? (isReminder ? 'Send reminder' : 'Post Homework') : 'Preview Homework';
  if (error || data?.error) {
    if (message) message.textContent = data?.error || 'Email could not be sent.';
    return;
  }
  if (deliverToTeam) {
    status.textContent = 'Published';
    status.classList.add('is-published');
    if (message) message.textContent = `${isReminder ? 'Reminder sent' : 'Posted'} to ${data?.sent || 0} account(s).`;
  } else if (message) {
    message.textContent = 'Preview sent to sriram87@gmail.com.';
  }
}

async function renderCoachSessionFocus(db, host) {
  host.hidden = false;
  host.innerHTML = '<p class="muted">Loading session focus…</p>';
  const [{ data: scheduleItems, error: scheduleError }, { data: assignments, error: assignmentError }] = await Promise.all([
    db.from('schedule_items').select('session_key,area,label,completed,sort_order').like('session_key', 'meeting-%').order('sort_order'),
    db.from('assignments').select('week_number,title,description,due_at,published').order('week_number')
  ]);
  if (scheduleError || assignmentError) {
    host.innerHTML = '<p class="form-message">Session focus is unavailable right now.</p>';
    window.FIREFLIES_DIAGNOSTICS?.report('Coach session focus', scheduleError || assignmentError);
    return;
  }
  const scheduleBySession = new Map();
  (scheduleItems || []).forEach(item => {
    const items = scheduleBySession.get(item.session_key) || [];
    items.push(item);
    scheduleBySession.set(item.session_key, items);
  });
  const assignmentByWeek = new Map((assignments || []).map(item => [Number(item.week_number), item]));
  const rhythm = window.FIREFLIES_HOMEWORK_RHYTHM?.assignments || {};
  host.innerHTML = `<div class="section-title"><div><span class="eyebrow">Coach view</span><h3>Session focus</h3></div><span class="status-chip">Schedule + homework</span></div>${Array.from({ length: 12 }, (_, index) => {
    const session = index + 1;
    const schedule = scheduleBySession.get(`meeting-${String(session).padStart(2, '0')}`) || [];
    const assignment = assignmentByWeek.get(session);
    const homework = assignment || rhythm[session] || {};
    const title = homework.title || `Session ${session}`;
    const focus = assignment?.description || homework.priority || 'Open the session plan for the current focus.';
    const sessionLink = `meeting-${String(session).padStart(2, '0')}.html`;
    const checklist = schedule.length ? `<section class="notebook-cell"><div class="cell-prompt"><span>Schedule checklist</span><ul class="coach-session-focus-list">${schedule.map(item => `<li class="${item.completed ? 'is-complete' : ''}"><strong>${esc(item.area)}:</strong> ${esc(item.label)}</li>`).join('')}</ul></div></section>` : '';
    return `<details class="homework-notebook coach-session" data-session-number="${session}"><summary class="notebook-title"><div><span>Session ${session}</span><h3>${esc(title)}</h3></div><strong>${schedule.length ? `${schedule.filter(item => item.completed).length}/${schedule.length} complete` : 'Session plan'}</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Homework focus</span><p>${esc(focus)}</p></div></section>${checklist}<footer><span>Source-linked</span><span><a href="${sessionLink}">Open session plan</a> · <a href="portal.html#homework">Open homework</a></span></footer></details>`;
  }).join('')}`;
}

function renderCoachWeekTwoCard() {
  const detail = document.querySelector('details[data-homework-week="2"]');
  if (!detail || detail.dataset.coachPresentation === 'true') return;
  detail.dataset.coachPresentation = 'true';
  detail.innerHTML = `<summary class="notebook-title"><div><span>Week 2 · Coach homework plan</span><h3>Choose a team name and a cause anchor</h3></div><strong>Due Wednesday, August 19</strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Coach context</span><h4>Team identity and project direction</h4><p>Students bring individual proposals. Use their responses to guide a shared discussion; do not decide the name or cause for them before hearing the group.</p></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Answer 1</span><h4>Team name proposal</h4><p>What team name is the student proposing?</p></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Answer 2</span><h4>Biodiversity cause</h4><p>What biodiversity cause should that name help the team investigate?</p></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Answer 3</span><h4>Why the name fits</h4><p>Why does the name fit the team’s interests and BIOGLOW?</p></div></section><section class="notebook-cell"><div class="cell-prompt"><span>Answer 4</span><h4>Next team step</h4><p>What should the team investigate or build next?</p></div></section><footer><span>Connected schedule</span><span><a href="meeting-02.html">Session 2 plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate"><h3>Review student responses</h3><p>Open the review workspace to read every student response and leave coach feedback.</p><a class="button primary" href="admin-homework.html">Open homework review</a></section>`;
}

function renderCoachWeekThreeCard() {
  const detail = document.querySelector('details[data-homework-week="3"]');
  if (!detail || detail.dataset.coachPresentation === 'true') return;
  detail.dataset.coachPresentation = 'true';
  detail.innerHTML = `<summary class="notebook-title"><div><span>Week 3 · Coach homework plan</span><h3>Model build, Field map, and Robot Maneuver</h3></div><strong>Due Wednesday, August 26</strong><em>Click to expand</em></summary>
    <section class="notebook-cell"><div class="cell-prompt"><span>Coach context</span><h4>Reflect on Session 2 work</h4><p>Students look back at the models, board measurements, and robot movement from Session 2. Use their observations to decide what the team should test or improve next.</p></div></section>
    <section class="notebook-cell"><div class="cell-prompt"><span>Task 1</span><h4>Read Project Sparks and answer</h4><p>Read the Project Sparks page. In the student’s own words, what does it say and what idea from the page could help a team begin an Innovation Project?</p></div><div class="worksheet-preview-grid"><a class="worksheet-preview-card" href="assets/img/notebook/project-sparks.png" target="_blank" rel="noopener"><img src="assets/img/notebook/project-sparks.png" alt="Project Sparks notebook page" loading="lazy"><strong>Project Sparks ↗</strong><small>Click to enlarge</small></a></div></section>
    <section class="notebook-cell"><div class="cell-prompt"><span>Task 2</span><h4>Read Challenge Story and answer</h4><p>Read the Challenge Story page. In the student’s own words, what is the challenge story asking teams to notice, explore, or improve?</p></div><div class="worksheet-preview-grid"><a class="worksheet-preview-card" href="assets/img/notebook/challenge-story.png" target="_blank" rel="noopener"><img src="assets/img/notebook/challenge-story.png" alt="Challenge Story notebook page" loading="lazy"><strong>Challenge Story ↗</strong><small>Click to enlarge</small></a></div></section>
    <section class="notebook-cell"><div class="cell-prompt"><span>Task 3</span><h4>Model build reflection</h4><p>Which numbered model did the student help build, improve, or observe in Session 2 (Model 5, 6, 7, or 1)? What is it meant to do, and what detail did they notice?</p></div></section>
    <section class="notebook-cell"><div class="cell-prompt"><span>Task 4</span><h4>Mission model and Project Spark connection</h4><p>Rewatch the Robot Game Missions video. Choose one mission model and explain in the student’s own words how it works, what it represents, and how it connects to a Project Spark.</p><div class="notebook-downloads"><a href="https://www.youtube.com/watch?v=uhZZ8O1StiQ" target="_blank" rel="noopener"><strong>Rewatch Robot Game Missions video ↗</strong><small>Observe how the mission models work</small></a></div></div></section>
    <section class="notebook-cell"><div class="cell-prompt"><span>Task 5</span><h4>Field map measurements</h4><p>What two board measurements did the student record? What landmarks did each measurement start and end at, and how could one help a robot run?</p></div></section>
    <section class="notebook-cell"><div class="cell-prompt"><span>Task 6</span><h4>Robot maneuver and next test</h4><p>What movement or maneuver did the group try? What worked or did not work, and what should they change next?</p></div></section>
    <section class="notebook-cell"><div class="cell-prompt"><span>Task 7</span><h4>Core Values · Discovery Activity 1</h4><p>FIRST LEGO League is done all over the world. Find out how many countries have FIRST LEGO League teams. Choose at least three of those countries and learn how to say “hello” and “My name is...” in languages spoken there.</p><div class="notebook-downloads"><a href="downloads/bioglow/core-values-discovery-1.pdf#page=3" target="_blank" rel="noopener"><strong>Discovery Activity 1 · page 3 ↗</strong><small>Open the Core Values activity book</small></a></div></div></section>
    <footer><span>Connected schedule</span><span><a href="meeting-03.html">Session 3 plan</a> · <a href="resources.html">Official resources</a></span></footer><section class="submission-gate"><h3>Review student responses</h3><p>Open the review workspace to read every student response and leave coach feedback.</p><a class="button primary" href="admin-homework.html">Open homework review</a></section>`;
}

async function openStudentForm(db, studentId, form, gate, week) {
  const message = form.querySelector('[data-homework-message]');
  const status = form.querySelector('[data-submit-status]');
  const existing = form.querySelector('[data-existing-files]');
  const { data: assignment, error: assignmentError } = await db.from('assignments').select('id,title,due_at').eq('week_number', week).eq('published', true).single();
  if (assignmentError) { if (gate) gate.innerHTML = '<p>Homework is unavailable right now.</p>'; return; }
  if (gate) gate.hidden = true;
  form.hidden = false;
  let { data: submission } = await db.from('submissions').select('id,status,submitted_at,coach_feedback,submission_answers(question_key,answer_text),submission_files(id,file_name,storage_path,mime_type,size_bytes)').eq('assignment_id', assignment.id).eq('student_id', studentId).maybeSingle();
  if (submission) {
    const answers = Object.fromEntries((submission.submission_answers || []).map(answer => [answer.question_key, answer.answer_text]));
    for (const field of form.querySelectorAll('[name]')) if (field.name !== 'files') field.value = answers[field.name] || '';
    status.textContent = ({ submitted: 'Submitted', review: 'Submitted', revise: 'Revision Requested', complete: 'Completed' })[submission.status] || 'Draft';
    renderStudentFiles(existing, submission.submission_files, db);
    const detail = form.closest('[data-homework-week]');
    if (detail && week === 0) detail.open = false;
    if (submission.status === 'complete') {
      form.querySelectorAll('input, textarea, select, button').forEach(field => { field.disabled = true; });
      message.textContent = submission.coach_feedback ? `Completed by your coach. Feedback: ${submission.coach_feedback}` : 'Completed by your coach.';
    } else if (submission.status === 'revise') {
      message.textContent = submission.coach_feedback ? `Revision requested: ${submission.coach_feedback}` : 'Revision requested. Update your work and submit again.';
    } else if (submission.coach_feedback) {
      message.textContent = `Coach feedback: ${submission.coach_feedback}`;
    }
  }
  updateStudentHomeworkCard(form.closest('[data-homework-week]'), submission?.status, assignment.due_at);
  form.onsubmit = async event => {
    event.preventDefault();
    if (submission?.status === 'complete') {
      message.textContent = 'This homework has been completed by your coach and can no longer be changed.';
      return;
    }
    if (form.dataset.submitting === 'true') return;
    form.dataset.submitting = 'true';
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Submitting…'; }
    message.textContent = 'Saving…';
    const fileField = form.elements.files;
    const programmingScreenshot = form.elements.cs2n_screenshot;
    const selectedFiles = [...(fileField ? fileField.files : []), ...(programmingScreenshot ? programmingScreenshot.files : [])];
    const existingKeys = new Set(distinctSubmissionFiles(submission?.submission_files).map(fileKey));
    const files = selectedFiles.filter((file, index) => {
      const key = fileKey(file);
      return selectedFiles.findIndex(candidate => fileKey(candidate) === key) === index && !existingKeys.has(key);
    });
    if (files.length > 5 || files.some(file => file.size > 8 * 1024 * 1024)) { message.textContent = 'One or more files could not be added.'; return; }
    const { data: saved, error: submissionError } = await db.from('submissions').upsert({ assignment_id: assignment.id, student_id: studentId, status: 'submitted', submitted_at: new Date().toISOString() }, { onConflict: 'assignment_id,student_id' }).select('id').single();
    if (submissionError) { window.FIREFLIES_DIAGNOSTICS?.report('Save homework', submissionError); message.textContent = 'Homework could not be saved right now.'; return; }
    const answers = [...form.querySelectorAll('[name]')].filter(field => !['files', 'cs2n_screenshot'].includes(field.name)).map((field, index) => ({ submission_id: saved.id, question_key: field.name, display_order: index, answer_type: field.tagName === 'TEXTAREA' ? 'long_text' : 'text', answer_text: field.value }));
    const { error: answerError } = await db.from('submission_answers').upsert(answers, { onConflict: 'submission_id,question_key' });
    if (answerError) { window.FIREFLIES_DIAGNOSTICS?.report('Save homework answers', answerError); message.textContent = 'Homework could not be saved right now.'; return; }
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) { message.textContent = 'This file type is not supported.'; return; }
      const path = `${studentId}/${saved.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: uploadError } = await db.storage.from('homework-files').upload(path, file, { contentType: file.type });
      if (uploadError) { window.FIREFLIES_DIAGNOSTICS?.report('Upload homework file', uploadError); message.textContent = 'A file could not be uploaded right now.'; return; }
      const { error: fileError } = await db.from('submission_files').insert({ submission_id: saved.id, file_name: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size, uploaded_by: studentId });
      if (fileError) { window.FIREFLIES_DIAGNOSTICS?.report('Save homework file', fileError); message.textContent = 'A file could not be saved right now.'; return; }
    }
    status.textContent = 'Submitted';
    updateStudentHomeworkCard(form.closest('[data-homework-week]'), 'submitted', assignment.due_at);
    message.textContent = `${assignment.title} submitted.`;
    if (fileField) fileField.value = '';
    if (programmingScreenshot) programmingScreenshot.value = '';
  };
}

function updateStudentHomeworkCard(detail, status, dueAt) {
  if (!detail) return;
  const due = detail.querySelector('summary strong');
  if (!due) return;
  const label = ({ submitted: 'Submitted', review: 'Submitted', revise: 'Revision Requested', complete: 'Completed' })[status];
  if (label) { due.textContent = label; return; }
  if (dueAt) due.textContent = `Due ${new Date(dueAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`;
}

function distinctSubmissionFiles(files = []) {
  const seen = new Set();
  return files.filter(file => {
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function renderStudentFiles(host, files, db) {
  host.innerHTML = distinctSubmissionFiles(files).map(file => `<span class="file-chip managed-file"><span>${esc(file.file_name)}</span><button type="button" class="remove-file" data-remove-file="${file.id}" data-storage-path="${esc(file.storage_path)}" title="Remove attachment" aria-label="Remove ${esc(file.file_name)}">×</button></span>`).join('');
  host.querySelectorAll('[data-remove-file]').forEach(button => {
    button.onclick = async () => {
      if (!confirm('Remove this attachment?')) return;
      const target = files.find(file => file.id === button.dataset.removeFile);
      const removed = target && await removeMatchingAttachments(db, files, target);
      if (!removed) return;
      files.filter(file => fileKey(file) === fileKey(target)).forEach(file => { file._removed = true; });
      button.closest('.managed-file')?.remove();
    };
  });
}
async function removeMatchingAttachments(db, files, target) {
  const matches = files.filter(file => fileKey(file) === fileKey(target));
  for (const file of matches) {
    if (!await removeAttachment(db, file.id, file.storage_path)) return false;
  }
  return true;
}
async function removeAttachment(db, fileId, storagePath) {
  const { error: storageError } = await db.storage.from('homework-files').remove([storagePath]);
  if (storageError) { alert('This attachment could not be removed right now.'); return false; }
  const { error: recordError } = await db.from('submission_files').delete().eq('id', fileId);
  if (recordError) { alert('This attachment could not be removed right now.'); return false; }
  return true;
}
function fileKey(file) { return `${file.file_name || file.name}::${file.size_bytes ?? file.size ?? ''}`; }
function safeName(value) { return String(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100); }
function esc(value) { return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
