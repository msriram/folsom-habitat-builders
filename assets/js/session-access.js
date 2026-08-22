const sessionConfig = window.FIREFLIES_PORTAL_CONFIG || {};
const sessionKey = document.body.dataset.session;
const plannedSessions = {
  'meeting-01': '2026-08-14', 'meeting-02': '2026-08-21', 'meeting-03': '2026-08-28',
  'meeting-04': '2026-09-04', 'meeting-05': '2026-09-11', 'meeting-06': '2026-09-18',
  'meeting-07': '2026-09-25', 'meeting-08': '2026-10-02', 'meeting-09': '2026-10-09',
  'meeting-10': '2026-10-16', 'meeting-11': '2026-10-23', 'meeting-12': '2026-10-30'
};

const sessionNotesStyle = document.createElement('style');
sessionNotesStyle.textContent = '.session-notes textarea{display:block;width:100%;min-height:18rem;box-sizing:border-box;resize:vertical;line-height:1.55;padding:1rem;border:1px solid var(--line,#d8dfd8);border-radius:.65rem;background:var(--surface,#fff);color:inherit}';
document.head.append(sessionNotesStyle);

function localDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isReleasedToTeam(item) {
  if (!item?.session_date) return false;
  const releaseDate = localDate(item.session_date);
  releaseDate.setDate(releaseDate.getDate() - 6); // Saturday before a Friday session
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= releaseDate;
}

function escapeSession(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function showUnavailable(message) {
  document.querySelector('main').innerHTML = `<section class="section compact tint"><div class="container"><div class="plain-panel"><span class="eyebrow">Schedule</span><h1>Session plan not available yet</h1><p>${message}</p><a class="button secondary" href="season.html">Back to Schedule</a></div></div></section>`;
}

async function addPublishedStudentReviews(db) {
  const { data: reviews, error } = await db.from('session_student_reviews')
    .select('attendance,work_completed,went_well,next_improvement,student:profiles!session_student_reviews_student_id_fkey(display_name)')
    .eq('session_key', sessionKey)
    .order('updated_at');
  if (error || !reviews?.length) return;
  const section = document.createElement('section');
  section.className = 'section compact published-session-reviews';
  section.innerHTML = `<div class="container"><article class="plain-panel"><div class="section-title"><div><span class="eyebrow">Session recap</span><h2>Student attendance and notes</h2></div></div><div class="session-student-review-list"><table class="session-review-table published-session-review-table"><thead><tr><th>Student</th><th>Areas focused</th><th>Highlights</th><th>Improvements</th><th>Attendance</th></tr></thead><tbody>${reviews.map(review => `<tr><th scope="row">${escapeSession(review.student?.display_name || 'Student')}</th><td>${escapeSession(review.work_completed || '—').replace(/\n/g, '<br>')}</td><td>${escapeSession(review.went_well || '—').replace(/\n/g, '<br>')}</td><td>${escapeSession(review.next_improvement || '—').replace(/\n/g, '<br>')}</td><td>${review.attendance === 'present' ? 'Present' : 'Absent'}</td></tr>`).join('')}</tbody></table></div></article></div>`;
  document.querySelector('main').append(section);
}

try {
  if (!sessionConfig.forceDemo && sessionConfig.supabaseUrl && sessionConfig.supabaseAnonKey) {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const db = createClient(sessionConfig.supabaseUrl, sessionConfig.supabaseAnonKey);
    const { data: { session: userSession } } = await db.auth.getSession();
    const { data: viewer } = userSession
      ? await db.from('profiles').select('role,approval_status').eq('id', userSession.user.id).maybeSingle()
      : { data: null };
    const approved = viewer?.approval_status === 'approved';
    const isCoach = approved && ['coach', 'student_coach'].includes(viewer.role);
    const { data: sessionRows, error } = approved
      ? await db.from('schedule_sessions').select('session_key,session_date,coach_notes,published,published_at').order('session_date')
      : { data: [], error: null };
    const savedSessions = sessionRows || [];
    const sessionFor = key => savedSessions.find(item => item.session_key === key)
      || (approved && plannedSessions[key] ? { session_key: key, session_date: plannedSessions[key], published: false, coach_notes: '' } : null);
    const current = sessionFor(sessionKey);
    const visibleToTeam = item => approved && Boolean(item) && (item.published || isReleasedToTeam(item));

    if (sessionKey && (!userSession || !approved)) {
      showUnavailable('Sign in with an approved team account to view session plans.');
    } else if (sessionKey && error) {
      showUnavailable('Session access is temporarily unavailable. Please try again shortly.');
    } else if (sessionKey && !isCoach && !visibleToTeam(current)) {
      showUnavailable('This session is still being prepared by the coaches. It will appear on the Saturday before the session.');
    } else if (sessionKey && current) {
      const notes = document.createElement('section');
      notes.className = 'section compact session-notes';
      if (isCoach) {
        notes.innerHTML = `<div class="container"><div class="plain-panel"><div class="section-title"><div><span class="eyebrow">Coach workspace</span><h2>Session notes</h2></div><span class="status-chip" data-session-status>${current.published ? 'Published to team' : 'Coach only'}</span></div><textarea rows="8" maxlength="6000" data-session-notes placeholder="Record decisions, evidence, follow-ups, and what should be shared with the team.">${escapeSession(current.coach_notes)}</textarea><div class="hero-actions"><button class="button secondary" type="button" data-save-session-notes>Save notes</button><button class="button primary" type="button" data-toggle-session>${current.published ? 'Unpublish session' : 'Publish completed session'}</button><span class="form-message" data-session-message aria-live="polite"></span></div></div></div>`;
        document.querySelector('main').append(notes);
        notes.querySelector('[data-save-session-notes]').onclick = async () => {
          const message = notes.querySelector('[data-session-message]');
          const { error: saveError } = await db.from('schedule_sessions').update({ coach_notes: notes.querySelector('[data-session-notes]').value }).eq('session_key', sessionKey);
          message.textContent = saveError ? 'Could not save notes.' : 'Notes saved.';
        };
        notes.querySelector('[data-toggle-session]').onclick = async () => {
          const next = !current.published;
          const message = notes.querySelector('[data-session-message]');
          const { error: publishError } = await db.from('schedule_sessions').update({ published: next, published_by: next ? userSession.user.id : null, published_at: next ? new Date().toISOString() : null }).eq('session_key', sessionKey);
          if (publishError) { message.textContent = 'Could not update publication status.'; return; }
          current.published = next;
          notes.querySelector('[data-session-status]').textContent = next ? 'Published to team' : 'Coach only';
          notes.querySelector('[data-toggle-session]').textContent = next ? 'Unpublish session' : 'Publish completed session';
          message.textContent = next ? 'Session published for approved students and parents.' : 'Session returned to coach-only view.';
        };
      } else if (current.coach_notes?.trim()) {
        notes.innerHTML = `<div class="container"><article class="plain-panel"><span class="eyebrow">Coach recap</span><h2>Session notes</h2><div class="session-note-copy">${escapeSession(current.coach_notes).replace(/\n/g, '<br>')}</div></article></div>`;
        document.querySelector('main').append(notes);
      }
      if (current.published) await addPublishedStudentReviews(db);
    }

    if (!sessionKey) {
      const links = [...document.querySelectorAll('a[href^="meeting-"]')];
      if (!isCoach) {
        links.forEach(link => {
          const key = link.getAttribute('href').split('.')[0];
          if (!visibleToTeam(sessionFor(key))) link.remove();
        });
      } else {
        links.forEach(link => {
          const item = sessionFor(link.getAttribute('href').split('.')[0]);
          if (item && !item.published && !isReleasedToTeam(item)) {
            const label = link.lastElementChild;
            if (label) label.textContent = 'Coach only →';
          }
        });
      }
    }
  }
} finally {
  document.body.removeAttribute('data-session-access-pending');
}
