const config = window.FIREFLIES_PORTAL_CONFIG || {};
const root = document.querySelector('[data-innovation-roadmap]');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function renderRoadmap(rows, canEdit) {
  const completed = rows.filter(row => row.completed).length;
  const percent = rows.length ? Math.round(completed / rows.length * 100) : 0;
  const stages = [...new Set(rows.map(row => row.stage))];
  root.innerHTML = `<div class="section-title"><div><span class="eyebrow">Team roadmap</span><h2>Innovation Project progress</h2><p class="muted">${completed} of ${rows.length} milestones complete</p></div><div class="project-progress-score"><strong>${percent}%</strong><div class="progress-track" role="progressbar" aria-label="Innovation Project progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-bar" style="width:${percent}%"></div></div></div></div>${stages.map(stage => `<section class="innovation-stage"><h3>${escapeHtml(stage)}</h3><div class="innovation-milestone-list">${rows.filter(row => row.stage === stage).map(row => `<label class="innovation-milestone ${row.completed ? 'is-complete' : ''}"><input type="checkbox" data-milestone-id="${row.id}" ${row.completed ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.detail)}</small></span></label>`).join('')}</div></section>`).join('')}<p class="form-message" data-roadmap-message>${canEdit ? 'Check a milestone when the team has genuinely completed it.' : 'Coaches update this shared team roadmap.'}</p>`;
}

async function init() {
  if (!root || !config.supabaseUrl || !config.supabaseAnonKey || config.forceDemo) return;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) { root.innerHTML = '<p class="muted">Sign in with an approved team account to view the shared project roadmap.</p>'; return; }
  const { data: profile } = await db.from('profiles').select('role,approval_status').eq('id', session.user.id).maybeSingle();
  if (profile?.approval_status !== 'approved') { root.innerHTML = '<p class="muted">This roadmap is available after coach approval.</p>'; return; }
  const canEdit = ['coach', 'student_coach'].includes(profile.role);
  const { data: rows, error } = await db.from('innovation_project_milestones').select('id,title,detail,stage,sort_order,completed').order('sort_order');
  if (error) { root.innerHTML = '<p class="muted">The project roadmap is being prepared. Please refresh shortly.</p>'; return; }
  renderRoadmap(rows || [], canEdit);
  if (!canEdit) return;
  root.querySelectorAll('[data-milestone-id]').forEach(input => input.addEventListener('change', async () => {
    const message = root.querySelector('[data-roadmap-message]');
    input.disabled = true;
    const completed = input.checked;
    const { error: updateError } = await db.from('innovation_project_milestones').update({ completed, completed_by: completed ? session.user.id : null, completed_at: completed ? new Date().toISOString() : null }).eq('id', input.dataset.milestoneId);
    if (updateError) { input.checked = !completed; message.textContent = 'Could not save that milestone. Please try again.'; input.disabled = false; return; }
    const row = rows.find(item => item.id === input.dataset.milestoneId);
    if (row) row.completed = completed;
    renderRoadmap(rows, canEdit);
  }));
}

init();
