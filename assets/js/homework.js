const cfg = window.FIREFLIES_PORTAL_CONFIG || {};
const forms = [...document.querySelectorAll('[data-homework-form]')];
const gates = [...document.querySelectorAll('[data-homework-gate]')];
const homeworkDetails = [...document.querySelectorAll('[data-homework-week]')];
const coachQueue = document.querySelector('#coach-session-queue');
const coachSessionsTab = document.querySelector('[data-tab="sessions"]');
const coachQueueHost = document.querySelector('#coach-session-queue-host');

// Future assignments are never exposed in the page's default (signed-out/student) view.
homeworkDetails.filter(detail => Number(detail.dataset.homeworkWeek) > 1).forEach(detail => { detail.hidden = true; });

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
    const { data: profile } = await db.from('profiles').select('id,role,approval_status,linked_student_id').eq('id', session.user.id).maybeSingle();
    configureHomeworkView(profile);
    for (const form of forms) {
      const week = Number(form.dataset.weekNumber);
      const gate = document.querySelector(`[data-homework-gate="${week}"]`);
      if (profile?.approval_status === 'approved' && profile.role === 'student') {
        await openStudentForm(db, session.user.id, form, gate, week);
      } else if (gate && profile?.approval_status === 'approved' && profile.role === 'parent') {
        gate.innerHTML = '<h2>Linked student homework</h2><p>Parents can review submitted work and coach feedback. Student accounts submit assignments.</p>';
      } else if (gate && profile?.approval_status === 'approved' && ['coach', 'student_coach'].includes(profile.role)) {
        gate.innerHTML = '<h2>Coach review</h2><p>View every student and submission in the homework review workspace.</p><a class="button primary" href="admin-homework.html">Open homework review</a>';
      } else if (gate && session) {
        gate.innerHTML = '<h2>Account approval required</h2><p>You are signed in. A coach must approve this account before homework is available.</p>';
      }
    }
  }
}

function configureHomeworkView(profile) {
  const approved = profile?.approval_status === 'approved';
  const isCoach = approved && ['coach', 'student_coach'].includes(profile.role);
  if (isCoach) {
    homeworkDetails.forEach(detail => { detail.hidden = true; detail.open = false; });
    if (coachSessionsTab) coachSessionsTab.hidden = false;
    if (coachQueue && coachQueueHost) coachQueueHost.append(coachQueue);
    if (coachQueue) {
      coachQueue.hidden = false;
      const descriptions = [
        'Read the official Session 1 deck; establish the robot and field baseline.',
        'Group related missions and test the first reliable robot run.',
        'Build, measure, and improve one mission family with evidence.',
        'Compare attachments and driving approaches; keep the best repeatable run.',
        'Test a second mission family and record failure modes.',
        'Connect robot observations to the team’s biodiversity question.',
        'Prototype and test an Innovation Project direction.',
        'Use feedback to revise the project idea and robot strategy.',
        'Run a timed practice; choose primary and backup mission runs.',
        'Rehearse explanation, evidence, and Core Values examples.',
        'Complete a full practice cycle and fix the largest reliability risk.',
        'Pack, rehearse, and record the final questions for tournament preparation.'
      ];
      coachQueue.innerHTML = `<div class="section-title"><div><span class="eyebrow">Coach view</span><h3>All 12 session assignments</h3></div><span class="status-chip">Collapsed queue</span></div>${descriptions.map((description, index) => { const session = index + 1; const link = session === 1 ? 'meeting-01.html' : session === 2 ? 'meeting-02.html' : 'resources.html'; return `<details class="homework-notebook coach-session" data-session-number="${session}"><summary class="notebook-title"><div><span>Session ${session}</span><h3>Session ${session} preparation</h3></div><strong aria-hidden="true"></strong><em>Click to expand</em></summary><section class="notebook-cell"><div class="cell-prompt"><span>Coach assignment</span><p>${description}</p></div><a class="button secondary" href="${link}">${session <= 2 ? 'Open session plan →' : 'Open official resources →'}</a></section></details>`; }).join('')}`;
    }
  }
}

async function openStudentForm(db, studentId, form, gate, week) {
  const message = form.querySelector('[data-homework-message]');
  const status = form.querySelector('[data-submit-status]');
  const existing = form.querySelector('[data-existing-files]');
  const { data: assignment, error: assignmentError } = await db.from('assignments').select('id,title').eq('week_number', week).eq('published', true).single();
  if (assignmentError) { if (gate) gate.innerHTML = '<p>Homework is unavailable right now.</p>'; return; }
  if (gate) gate.hidden = true;
  form.hidden = false;
  let { data: submission } = await db.from('submissions').select('id,status,submitted_at,submission_answers(question_key,answer_text),submission_files(id,file_name,storage_path,mime_type)').eq('assignment_id', assignment.id).eq('student_id', studentId).maybeSingle();
  if (submission) {
    const answers = Object.fromEntries((submission.submission_answers || []).map(answer => [answer.question_key, answer.answer_text]));
    for (const field of form.querySelectorAll('[name]')) if (field.name !== 'files') field.value = answers[field.name] || '';
    status.textContent = submission.status === 'submitted' ? 'Submitted' : 'Draft';
    existing.innerHTML = (submission.submission_files || []).map(file => `<span class="file-chip">${esc(file.file_name)}</span>`).join('');
    const detail = form.closest('[data-homework-week]');
    if (detail && week === 0) detail.open = false;
  }
  form.onsubmit = async event => {
    event.preventDefault();
    message.textContent = 'Saving…';
    const fileField = form.elements.files;
    const files = fileField ? [...fileField.files] : [];
    if (files.length > 5 || files.some(file => file.size > 8 * 1024 * 1024)) { message.textContent = 'One or more files could not be added.'; return; }
    const { data: saved, error: submissionError } = await db.from('submissions').upsert({ assignment_id: assignment.id, student_id: studentId, status: 'submitted', submitted_at: new Date().toISOString() }, { onConflict: 'assignment_id,student_id' }).select('id').single();
    if (submissionError) { window.FIREFLIES_DIAGNOSTICS?.report('Save homework', submissionError); message.textContent = 'Homework could not be saved right now.'; return; }
    const answers = [...form.querySelectorAll('[name]')].filter(field => field.name !== 'files').map((field, index) => ({ submission_id: saved.id, question_key: field.name, display_order: index, answer_type: field.tagName === 'TEXTAREA' ? 'long_text' : 'text', answer_text: field.value }));
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
    message.textContent = `${assignment.title} submitted.`;
    if (fileField) fileField.value = '';
  };
}

function safeName(value) { return String(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100); }
function esc(value) { return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
