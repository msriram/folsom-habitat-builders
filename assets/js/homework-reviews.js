const cfg = window.FIREFLIES_PORTAL_CONFIG || {};
const state = document.querySelector('[data-reviews-state]');
const toolbar = document.querySelector('[data-review-toolbar]');
const select = document.querySelector('[data-review-assignment]');
const count = document.querySelector('[data-review-count]');
const list = document.querySelector('[data-review-list]');

if (cfg.forceDemo || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
  state.textContent = 'Published homework reviews are unavailable right now.';
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const session = await readSession(db);
  if (!session) {
    state.innerHTML = 'Sign in with an approved account to view the team roll-up. <a href="login.html">Sign in</a>';
  } else {
    const { data: profile } = await db.from('profiles').select('role,approval_status,is_active').eq('id', session.user.id).single();
    if (!profile || profile.approval_status !== 'approved' || !profile.is_active || !['student','parent','coach','student_coach'].includes(profile.role)) {
      state.textContent = 'Approved team access is required to view homework reviews.';
    } else {
      const { data: assignments, error } = await db.from('assignments').select('id,title,week_number').eq('published', true).eq('reviews_published', true).order('week_number');
      if (error || !assignments?.length) {
        state.textContent = 'No homework review has been published yet.';
      } else {
        state.hidden = true;
        toolbar.hidden = false;
        select.innerHTML = assignments.map(a => `<option value="${a.id}">Week ${a.week_number}: ${esc(a.title)}</option>`).join('');
        select.onchange = () => load(db, select.value);
        await load(db, assignments[0].id);
      }
    }
  }
}

// The shared header initializes Supabase at the same time as this page module.
// Give the OAuth client a moment to finish restoring a persisted Google session
// before showing the signed-out state.
async function readSession(db) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: { session } } = await db.auth.getSession();
    if (session) return session;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250));
  }
  return null;
}

async function load(db, assignmentId) {
  list.innerHTML = '<p class="muted">Loading published work…</p>';
  const { data: reviews, error } = await db.rpc('published_homework_reviews', { target_assignment: assignmentId });
  if (error) { list.innerHTML = `<p class="form-message">${esc(error.message || 'Reviews could not be loaded.')}</p>`; return; }
  count.textContent = `${reviews.length} student perspectives`;
  list.innerHTML = reviews.map(review => `<article class="review-rollup-card"><header><div><span class="eyebrow">${review.status === 'not_submitted' ? 'Coach note' : 'Student work'}</span><h2>${esc(review.display_name)}</h2></div><span class="status-chip">${review.status === 'not_submitted' ? 'Did not submit' : 'Reviewed'}</span></header><div class="review-rollup-grid"><div><h3>Topic</h3><p>${esc(review.topic || 'No topic recorded.')}</p><h3>What interested the student</h3><p>${esc(review.paragraph || 'No written response was submitted.')}</p>${review.sources ? `<h3>Sources</h3><p>${esc(review.sources)}</p>` : ''}</div><aside><h3>Coach feedback</h3><p>${esc(review.coach_feedback || 'No feedback recorded.')}</p>${renderFiles(review.files || [])}</aside></div></article>`).join('');
  for (const image of list.querySelectorAll('[data-review-file]')) {
    const path = image.dataset.reviewFile;
    const { data } = await db.storage.from('homework-files').createSignedUrl(path, 900);
    if (data?.signedUrl) image.href = data.signedUrl;
  }
}

function renderFiles(files) {
  const uniqueFiles = distinctFiles(files);
  if (!uniqueFiles.length) return '';
  return `<div class="review-files"><h3>Submitted files</h3>${uniqueFiles.map(file => `<a data-review-file="${esc(file.storage_path)}" href="#" target="_blank" rel="noopener">${esc(file.file_name)}</a>`).join('')}</div>`;
}
function distinctFiles(files = []) {
  const seen = new Set();
  return files.filter(file => {
    const key = `${file.file_name}::${file.size_bytes ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function esc(value) { return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
