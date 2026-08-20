const cfg = window.FIREFLIES_PORTAL_CONFIG || {};
const state = document.querySelector('[data-review-state]');
const shell = document.querySelector('[data-review-shell]');
const tabs = document.querySelector('[data-student-tabs]');
const detail = document.querySelector('[data-review-detail]');
const assignmentSelect = document.querySelector('[data-assignment-select]');
const publishPanel = document.querySelector('[data-publish-panel]');
const publishStatus = document.querySelector('[data-publish-status]');
const publishMessage = document.querySelector('[data-publish-message]');
const publishButton = document.querySelector('[data-publish-reviews]');
let db;
let currentAssignmentId;

if (cfg.forceDemo || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
  state.textContent = 'Homework review is unavailable right now.';
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  db = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const session = await readSession(db);
  if (!session) {
    state.innerHTML = 'Coach sign-in required. <a href="login.html">Sign in</a>';
  } else {
    const { data: me } = await db.from('profiles').select('role,approval_status').eq('id', session.user.id).single();
    if (!['coach', 'student_coach'].includes(me?.role) || me.approval_status !== 'approved') {
      if (document.querySelector('[data-embedded-review-workspace]')) state.hidden = true;
      else state.textContent = 'Approved coach access required.';
    } else {
      document.querySelector('[data-embedded-review-workspace]')?.removeAttribute('hidden');
      document.querySelector('[data-coach-review-open]')?.removeAttribute('hidden');
      state.hidden = true;
      shell.hidden = false;
      const { data: assignments, error } = await db.from('assignments')
        .select('id,title,week_number,published,reviews_published,reviews_published_at')
        .order('week_number');
      if (error) {
        showError('Homework review is unavailable right now.');
      } else {
        assignmentSelect.innerHTML = (assignments || []).map(a =>
          `<option value="${a.id}">Week ${a.week_number}: ${esc(a.title)}${a.published ? '' : ' (coach draft)'}</option>`).join('');
        assignmentSelect.onchange = () => load(aById(assignments, assignmentSelect.value));
        if (assignments?.[0]) await load(assignments[0]);
      }
    }
  }
}

function aById(assignments, id) { return assignments.find(a => a.id === id) || assignments[0]; }

async function load(assignment, selectedStudentId = null) {
  if (!assignment) return;
  currentAssignmentId = assignment.id;
  publishPanel.hidden = false;
  publishMessage.textContent = '';
  const [{ data: users, error: userError }, { data: submissions, error }, { data: questions, error: questionError }] = await Promise.all([
    db.rpc('admin_users'),
    db.from('submissions').select('id,student_id,status,submitted_at,score,coach_feedback,submission_answers(question_key,display_order,answer_type,answer_text,answer_json),submission_files(id,file_name,storage_path,mime_type,size_bytes)').eq('assignment_id', assignment.id),
    db.from('assignment_questions').select('question_key,prompt,display_order').eq('assignment_id', assignment.id).order('display_order')
  ]);
  if (error || userError || questionError) {
    showError('Homework review is unavailable right now.');
    return;
  }
  const questionMap = new Map((questions || []).map(question => [question.question_key, question.prompt]));
  const students = (users || []).filter(u => u.role === 'student');
  const byStudent = new Map((submissions || []).map(s => [s.student_id, s]));
  const reviewed = students.filter(s => ['revise', 'complete'].includes(byStudent.get(s.id)?.status)).length;
  publishStatus.textContent = assignment.reviews_published
    ? `Reviews available ${assignment.reviews_published_at ? `since ${new Date(assignment.reviews_published_at).toLocaleDateString()}` : ''}`
    : `Review decisions recorded for ${reviewed} of ${students.length} students.`;
  publishButton.hidden = false;
  publishButton.disabled = assignment.reviews_published || students.length === 0 || reviewed < students.length;
  publishButton.textContent = assignment.reviews_published ? 'Reviews published' : 'Publish homework reviews';
  publishButton.onclick = () => publish(assignment);
  tabs.innerHTML = students.map(student => {
    const submission = byStudent.get(student.id);
    const status = submissionStatusLabel(submission?.status);
    return `<button data-student="${student.id}"><strong>${esc(student.display_name)}</strong><span>${status}</span></button>`;
  }).join('') || '<p>No approved students yet.</p>';
  tabs.onclick = event => {
    const button = event.target.closest('[data-student]');
    if (!button) return;
    tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    show(assignment, students.find(s => s.id === button.dataset.student), byStudent.get(button.dataset.student), questionMap);
  };
  const first = selectedStudentId || students[0]?.id;
  if (first) {
    const button = tabs.querySelector(`[data-student="${first}"]`);
    button?.classList.add('active');
    show(assignment, students.find(s => s.id === first), byStudent.get(first), questionMap);
  }
}

async function show(assignment, student, submission, questionMap = new Map()) {
  if (!student) return;
  if (!submission) {
    detail.innerHTML = `<div class="section-title"><div><h2>${esc(student.display_name)}</h2><p class="status-chip">Not submitted</p></div></div><p>There is no student submission to review yet.</p>`;
    return;
  }
  const files = await Promise.all(distinctSubmissionFiles(submission.submission_files).map(async file => {
    const { data } = await db.storage.from('homework-files').createSignedUrl(file.storage_path, 900);
    return { ...file, url: data?.signedUrl };
  }));
  detail.innerHTML = `<div class="section-title"><div><h2>${esc(student.display_name)}</h2><p>${submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Coach record'}</p></div><span class="status-chip">${submissionStatusLabel(submission.status)}</span></div>${(submission.submission_answers || []).sort((a, b) => a.display_order - b.display_order).map(answer => `<article class="answer-card"><span class="eyebrow">Question</span><h3>${esc(questionMap.get(answer.question_key) || label(answer.question_key))}</h3><p>${esc(answer.answer_text || JSON.stringify(answer.answer_json || ''))}</p></article>`).join('')}<div class="submission-gallery">${files.map(file => file.mime_type.startsWith('image/') ? `<a href="${file.url}" target="_blank"><img src="${file.url}" alt="${esc(file.file_name)}"><span>${esc(file.file_name)}</span></a>` : `<a class="file-chip" href="${file.url}" target="_blank">${esc(file.file_name)}</a>`).join('')}</div>${feedbackEditor(assignment, student, submission.coach_feedback || '', submission)}`;
  bindFeedback(assignment, student, submission);
}

function feedbackEditor(assignment, student, feedback, submission) {
  return `<section class="coach-review-actions"><label>Coach feedback<textarea rows="5" data-feedback>${esc(feedback)}</textarea></label><div class="hero-actions"><button class="button secondary" data-request-revision>Request revision</button><button class="button primary" data-mark-complete>Mark completed</button></div></section>`;
}

function bindFeedback(assignment, student, submission) {
  const save = async (status, event) => {
    const feedback = detail.querySelector('[data-feedback]').value.trim();
    if (status === 'revise' && !feedback) { publishMessage.textContent = 'Add feedback so the student knows what to revise.'; return; }
    const result = await db.from('submissions').update({ coach_feedback: feedback, status }).eq('id', submission.id);
    if (result.error) {
      window.FIREFLIES_DIAGNOSTICS?.report('Homework feedback', result.error);
      event.currentTarget.textContent = 'Try again';
    } else {
      await load(assignment, student.id);
    }
  };
  detail.querySelector('[data-request-revision]').onclick = event => save('revise', event);
  detail.querySelector('[data-mark-complete]').onclick = event => save('complete', event);
}

function submissionStatusLabel(status) {
  return ({ submitted: 'Submitted', review: 'Submitted', revise: 'Revision Requested', complete: 'Completed' })[status] || 'Not submitted';
}

async function publish(assignment) {
  publishButton.disabled = true;
  publishMessage.textContent = 'Checking every student and publishing…';
  const { error } = await db.rpc('publish_homework_reviews', { target_assignment: assignment.id });
  if (error) {
    publishMessage.textContent = error.message || 'Feedback is still missing.';
    publishButton.disabled = false;
    return;
  }
  await load({ ...assignment, reviews_published: true, reviews_published_at: new Date().toISOString() });
  publishMessage.innerHTML = `Published. <a href="portal.html?tab=reviews&assignment=${encodeURIComponent(assignment.id)}">Open the team roll-up →</a>`;
}

function showError(message) { state.hidden = false; state.textContent = message; shell.hidden = true; }
async function readSession(client) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: { session } } = await client.auth.getSession();
    if (session) return session;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250));
  }
  return null;
}
function label(value) { return ({ topic: 'Chosen topic', paragraph: 'What interests the student', sources: 'Sources used', team_name: 'Proposed team name', cause: 'Cause anchor', reason: 'Why this fits', next_step: 'Next step', cs2n_reflection: 'How the CS2N program worked' })[value] || value; }
function distinctSubmissionFiles(files = []) {
  const seen = new Set();
  return files.filter(file => {
    const key = `${file.file_name}::${file.size_bytes ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function esc(value) { return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
