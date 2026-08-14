const config = window.FIREFLIES_PORTAL_CONFIG || {};
const homeworkHost = document.querySelector('[data-cs2n-robot-homework]');
const robotHost = document.querySelector('[data-cs2n-robot-drills]');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const DAY = 24 * 60 * 60 * 1000;
let db;

if ((homeworkHost || robotHost) && !config.forceDemo && config.supabaseUrl && config.supabaseAnonKey) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  db = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) renderSignedOut(); else await load(session.user.id);
}

function renderSignedOut() { if (homeworkHost) homeworkHost.innerHTML = '<p class="muted">Sign in with an approved account to view programming homework.</p>'; if (robotHost) robotHost.innerHTML = '<p class="muted">Sign in to open the private CS2N programming path.</p>'; }
async function load(userId) {
  const [{ data: profile }, { data: tasks, error }] = await Promise.all([db.from('profiles').select('id,role,approval_status,linked_student_id').eq('id', userId).maybeSingle(), db.from('robot_homework_tasks').select('*').order('week_number')]);
  if (!profile || profile.approval_status !== 'approved' || error) { renderSignedOut(); return; }
  const visibleTasks = (tasks || []).filter(task => task.week_number >= 2);
  const { data: submissions } = await db.from('robot_homework_submissions').select('*');
  const ids = [...new Set((submissions || []).map(item => item.student_id))];
  const { data: students } = ids.length ? await db.from('profiles').select('id,display_name').in('id', ids) : { data: [] };
  const names = new Map((students || []).map(student => [student.id, student.display_name]));
  const allSubmissions = await Promise.all((submissions || []).map(async item => { const { data } = item.screenshot_path ? await db.storage.from('robot-homework').createSignedUrl(item.screenshot_path, 900) : { data: null }; return { ...item, screenshot_url: data?.signedUrl, student_name: names.get(item.student_id) || 'Student' }; }));
  const studentId = profile.role === 'parent' ? profile.linked_student_id : userId;
  const own = new Map(allSubmissions.filter(item => item.student_id === studentId).map(item => [item.task_id, item]));
  const byTask = new Map(); allSubmissions.forEach(item => byTask.set(item.task_id, [...(byTask.get(item.task_id) || []), item]));
  const context = { isStudent: profile.role === 'student', isCoach: ['coach','student_coach'].includes(profile.role), own, byTask };
  const homeworkTasks = context.isCoach ? visibleTasks : visibleTasks.filter(task => task.week_number <= releasedHomeworkWeek());
  renderHomework(homeworkTasks, context); renderRobotLab(visibleTasks);
}
function releasedHomeworkWeek() {
  const now = new Date();
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstRelease = new Date(2026, 7, 12); // Wednesday before Week 2 begins.
  return Math.max(1, Math.floor((localToday - firstRelease) / (7 * DAY)) + 2);
}
function renderHomework(tasks, context) {
  if (!homeworkHost) return;
  homeworkHost.innerHTML = tasks.filter(task => context.isCoach ? task.week_number >= 2 : task.week_number > 2).map(task => `<details class="homework-notebook homework-next cs2n-week" data-homework-week="${task.week_number}"><summary class="notebook-title"><div><span>Week ${task.week_number} · ${task.phase === 'optional' ? 'Optional extension' : 'Homework'}</span><h3>${esc(task.title)}</h3></div><strong>${task.phase === 'optional' ? 'Optional' : 'CS2N'}</strong><em>Click to expand</em></summary><section class="notebook-cell">${homeworkTask(task, context)}</section></details>`).join('');
  if (context.isStudent) bindStudent(); if (context.isCoach) bindCoach();
}
function homeworkTask(task, context) {
  const submission = context.own.get(task.id); const status = submission?.submitted_at ? `Submitted${submission.score != null ? ` · ${submission.score}/10` : ''}` : task.phase === 'optional' ? 'Optional' : 'To do';
  const hints = (task.hints || []).map(hint => `<li>${esc(hint)}</li>`).join('');
  const studentForm = context.isStudent ? `<form data-cs2n-submit="${task.id}" class="cs2n-submit"><label>Screenshot of your completed CS2N program<input type="file" name="screenshot" accept="image/jpeg,image/png,image/webp" required></label><label>How did your program work?<textarea name="reflection" rows="4" minlength="20" maxlength="2000" required>${esc(submission?.reflection || '')}</textarea></label><button class="button primary" type="submit">Submit homework</button><p class="form-message" aria-live="polite"></p></form>` : '';
  const coachForms = context.isCoach ? (context.byTask.get(task.id) || []).map(item => `<div class="cs2n-coach-mark"><strong>${esc(item.student_name)}</strong>${item.screenshot_url ? `<a class="file-chip" href="${esc(item.screenshot_url)}" target="_blank" rel="noopener">Open screenshot</a>` : ''}<p>${esc(item.reflection)}</p><label>Mark / 10<input type="number" min="0" max="10" step="0.5" value="${item.score ?? ''}" data-cs2n-score="${item.id}"></label><label>Coach note<textarea rows="3" data-cs2n-feedback="${item.id}">${esc(item.coach_feedback || '')}</textarea></label><button class="mini-action" type="button" data-cs2n-mark="${item.id}">Save mark</button></div>`).join('') : '';
  return `<div class="cs2n-task ${task.phase}"><div class="research-question-head"><span class="status-chip">${status}</span></div><p>${esc(task.description)}</p><div class="hero-actions"><a class="button secondary" href="portal.html?tab=robot">Open Robot Lab</a><a class="button secondary" href="${esc(task.cs2n_url)}" target="_blank" rel="noopener">Open CS2N lesson ↗</a></div><details><summary>Programming hints</summary><ul>${hints}</ul></details>${submission?.screenshot_url ? `<a class="cs2n-screenshot" href="${esc(submission.screenshot_url)}" target="_blank" rel="noopener"><img src="${esc(submission.screenshot_url)}" alt="Submitted CS2N screenshot"><span>${esc(submission.screenshot_file_name || 'Open submitted screenshot')}</span></a>` : ''}${studentForm}${coachForms}</div>`;
}
function renderRobotLab(tasks) { if (robotHost) robotHost.innerHTML = `<div class="section-title"><div><span class="eyebrow">Programming reference</span><h3>CS2N Virtual SPIKE Prime drills</h3><p class="muted">Use this library for practice. Submit work only from the matching week in Homework.</p></div></div><div class="cs2n-homework-grid">${tasks.map(task => `<article class="card cs2n-task ${task.phase}"><div class="research-question-head"><span class="status-chip">Week ${task.week_number}</span><span class="eyebrow">${task.phase}</span></div><h4>${esc(task.title)}</h4><p>${esc(task.description)}</p><details><summary>Programming hints</summary><ul>${(task.hints || []).map(hint => `<li>${esc(hint)}</li>`).join('')}</ul></details><a class="button secondary" href="${esc(task.cs2n_url)}" target="_blank" rel="noopener">Open CS2N lesson ↗</a></article>`).join('')}</div>`; }
function bindStudent() { document.querySelectorAll('[data-cs2n-submit]').forEach(form => form.addEventListener('submit', async event => { event.preventDefault(); const message = form.querySelector('.form-message'), file = form.elements.screenshot.files[0], reflection = form.elements.reflection.value.trim(); if (!file || file.size > 8 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) { message.textContent = 'Upload one PNG, JPEG, or WebP screenshot under 8 MB.'; return; } message.textContent = 'Uploading screenshot…'; const userId = (await db.auth.getUser()).data.user.id, path = `${userId}/${form.dataset.cs2nSubmit}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`; const { error: uploadError } = await db.storage.from('robot-homework').upload(path, file, { contentType: file.type }); if (uploadError) { message.textContent = 'The screenshot could not be uploaded.'; return; } const { error } = await db.rpc('submit_robot_homework', { target_task: form.dataset.cs2nSubmit, response_reflection: reflection, image_path: path, image_name: file.name }); message.textContent = error ? (error.message || 'Homework could not be submitted.') : 'Homework submitted.'; })); }
function bindCoach() { document.querySelectorAll('[data-cs2n-mark]').forEach(button => button.addEventListener('click', async () => { const id=button.dataset.cs2nMark, score=document.querySelector(`[data-cs2n-score="${id}"]`).value, coach_feedback=document.querySelector(`[data-cs2n-feedback="${id}"]`).value.trim(); const { error }=await db.from('robot_homework_submissions').update({score:score===''?null:Number(score),coach_feedback}).eq('id',id); button.textContent=error?'Try again':'Saved'; })); }
