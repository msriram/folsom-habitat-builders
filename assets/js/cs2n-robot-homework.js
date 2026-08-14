const config = window.FIREFLIES_PORTAL_CONFIG || {};
const host = document.querySelector('[data-cs2n-robot-homework]');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let db;

if (host && !config.forceDemo && config.supabaseUrl && config.supabaseAnonKey) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  db = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    host.innerHTML = '<p class="muted">Sign in with an approved account to track CS2N programming homework.</p>';
  } else {
    const { data: profile } = await db.from('profiles').select('id,role,approval_status,linked_student_id').eq('id', session.user.id).maybeSingle();
    if (!profile || profile.approval_status !== 'approved') {
      host.innerHTML = '<p class="muted">Account approval is required for CS2N programming homework.</p>';
    } else {
      const { data: tasks, error } = await db.from('robot_homework_tasks').select('*').order('week_number');
      if (error) host.innerHTML = '<p class="muted">Programming homework is being set up. Please refresh shortly.</p>';
      else render(tasks || [], profile, session.user.id);
    }
  }
}

async function render(tasks, profile, userId) {
  const studentId = profile.role === 'parent' ? profile.linked_student_id : userId;
  const isStudent = profile.role === 'student';
  const isCoach = ['coach','student_coach'].includes(profile.role);
  const { data: submissions } = await db.from('robot_homework_submissions').select('*');
  const ids = [...new Set((submissions || []).map(s => s.student_id))];
  const { data: students } = ids.length ? await db.from('profiles').select('id,display_name').in('id', ids) : { data: [] };
  const names = new Map((students || []).map(student => [student.id, student.display_name]));
  const enriched = await Promise.all((submissions || []).map(async submission => {
    const { data } = submission.screenshot_path ? await db.storage.from('robot-homework').createSignedUrl(submission.screenshot_path, 900) : { data: null };
    return { ...submission, screenshot_url: data?.signedUrl, student_name: names.get(submission.student_id) || 'Student' };
  }));
  const own = new Map(enriched.filter(s => s.student_id === studentId).map(s => [s.task_id, s]));
  const byTask = new Map(); enriched.forEach(submission => byTask.set(submission.task_id, [...(byTask.get(submission.task_id) || []), submission]));
  host.innerHTML = `<div class="section-title"><div><span class="eyebrow">CS2N programming path</span><h3>Virtual SPIKE Prime homework</h3><p class="muted">Weeks 1–8 are required. Weeks 9–12 are optional extensions.</p></div></div><div class="cs2n-homework-grid">${tasks.map(task => card(task, own.get(task.id), byTask.get(task.id) || [], { isStudent, isCoach })).join('')}</div>`;
  if (isStudent) bindStudent(tasks, userId, db);
  if (isCoach) bindCoach(tasks, db);
}

function card(task, submission, taskSubmissions, { isStudent, isCoach }) {
  const status = submission?.submitted_at ? `Submitted${submission.score != null ? ` · ${submission.score}/10` : ''}` : task.phase === 'optional' ? 'Optional' : 'To do';
  const hints = (task.hints || []).map(hint => `<li>${esc(hint)}</li>`).join('');
  const studentForm = isStudent ? `<form data-cs2n-submit="${task.id}" class="cs2n-submit"><label>Screenshot of your completed CS2N program<input type="file" name="screenshot" accept="image/jpeg,image/png,image/webp" required></label><label>How did your program work?<textarea name="reflection" rows="4" minlength="20" maxlength="2000" required>${esc(submission?.reflection || '')}</textarea></label><button class="button primary" type="submit">Submit programming work</button><p class="form-message" aria-live="polite"></p></form>` : '';
  const coachForms = isCoach ? taskSubmissions.map(item => `<div class="cs2n-coach-mark"><strong>${esc(item.student_name)}</strong>${item.screenshot_url ? `<a class="file-chip" href="${esc(item.screenshot_url)}" target="_blank" rel="noopener">Open screenshot</a>` : ''}<p>${esc(item.reflection)}</p><label>Mark / 10<input type="number" min="0" max="10" step="0.5" value="${item.score ?? ''}" data-cs2n-score="${item.id}"></label><label>Coach note<textarea rows="3" data-cs2n-feedback="${item.id}">${esc(item.coach_feedback || '')}</textarea></label><button class="mini-action" type="button" data-cs2n-mark="${item.id}">Save mark</button></div>`).join('') : '';
  return `<article class="card cs2n-task ${task.phase}"><div class="research-question-head"><span class="status-chip">Week ${task.week_number} · ${status}</span><span class="eyebrow">${task.phase}</span></div><h4>${esc(task.title)}</h4><p>${esc(task.description)}</p><div class="hero-actions"><a class="button secondary" href="portal.html?tab=robot">Open Robot Lab</a><a class="button secondary" href="${esc(task.cs2n_url)}" target="_blank" rel="noopener">Open CS2N lesson ↗</a></div><details><summary>Programming hints</summary><ul>${hints}</ul></details>${submission?.screenshot_url ? `<a class="cs2n-screenshot" href="${esc(submission.screenshot_url)}" target="_blank" rel="noopener"><img src="${esc(submission.screenshot_url)}" alt="Submitted CS2N screenshot"><span>${esc(submission.screenshot_file_name || 'Open submitted screenshot')}</span></a>` : ''}${studentForm}${coachForms}</article>`;
}

function bindStudent(tasks, userId, db) {
  host.querySelectorAll('[data-cs2n-submit]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    const file = form.elements.screenshot.files[0];
    const reflection = form.elements.reflection.value.trim();
    if (!file || file.size > 8 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) { message.textContent = 'Upload one PNG, JPEG, or WebP screenshot under 8 MB.'; return; }
    message.textContent = 'Uploading screenshot…';
    const path = `${userId}/${form.dataset.cs2nSubmit}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await db.storage.from('robot-homework').upload(path, file, { contentType: file.type });
    if (uploadError) { message.textContent = 'The screenshot could not be uploaded.'; return; }
    const { error } = await db.rpc('submit_robot_homework', { target_task: form.dataset.cs2nSubmit, response_reflection: reflection, image_path: path, image_name: file.name });
    if (error) { message.textContent = error.message || 'Programming work could not be submitted.'; return; }
    message.textContent = 'Programming work submitted.';
  }));
}

function bindCoach(tasks, db) {
  host.querySelectorAll('[data-cs2n-mark]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.cs2nMark;
    const score = host.querySelector(`[data-cs2n-score="${id}"]`).value;
    const coach_feedback = host.querySelector(`[data-cs2n-feedback="${id}"]`).value.trim();
    const { error } = await db.from('robot_homework_submissions').update({ score: score === '' ? null : Number(score), coach_feedback }).eq('id', id);
    button.textContent = error ? 'Try again' : 'Saved';
  }));
}
