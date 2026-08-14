const config = window.FIREFLIES_PORTAL_CONFIG || {};
const state = document.querySelector('[data-ai-questions-state]');
const list = document.querySelector('[data-ai-questions-list]');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const formatAnswer = value => escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

if (config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) {
  state.textContent = 'Ask AI history is unavailable right now.';
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    state.innerHTML = 'Sign in to view Ask AI history. <a href="login.html">Sign in</a>';
  } else {
    const { data: profile } = await db.from('profiles').select('role,approval_status').eq('id', session.user.id).maybeSingle();
    if (!profile || profile.approval_status !== 'approved') {
      state.textContent = 'Coach approval is required to view Ask AI history.';
    } else {
      const { data: questions, error } = await db.from('questions')
        .select('question,ai_answer,created_at,author_id')
        .not('ai_answer', 'is', null)
        .order('created_at', { ascending: false });
      if (error) {
        window.FIREFLIES_DIAGNOSTICS?.report('Ask AI history', error);
        state.textContent = 'Ask AI history is unavailable right now.';
      } else {
        const canIdentifyAuthors = ['coach', 'student_coach'].includes(profile.role);
        const names = new Map();
        if (canIdentifyAuthors && questions?.length) {
          const ids = [...new Set(questions.map(item => item.author_id).filter(Boolean))];
          const { data: authors } = await db.from('profiles').select('id,display_name').in('id', ids);
          (authors || []).forEach(author => names.set(author.id, author.display_name));
        }
        state.hidden = true;
        list.innerHTML = (questions || []).map(item => {
          const label = canIdentifyAuthors ? `Asked by ${escapeHtml(names.get(item.author_id) || 'Team member')}` : 'Team question';
          return `<article class="card"><span class="status-chip">${label}</span><h2>${escapeHtml(item.question)}</h2><p class="ai-answer">${formatAnswer(item.ai_answer)}</p><small class="muted">${new Date(item.created_at).toLocaleDateString()}</small></article>`;
        }).join('') || '<p class="muted">No Ask AI questions yet.</p>';
      }
    }
  }
}
