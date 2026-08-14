const config = window.FIREFLIES_PORTAL_CONFIG || {};
const state = document.querySelector('[data-ai-questions-state]');
const list = document.querySelector('[data-ai-questions-list]');
const categoryList = document.querySelector('[data-ai-category-list]');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
const formatAnswer = value => escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const categories = [
  ['Robotics & Coding', /robot|lego|spike|mission|motor|sensor|program|code|coding|autonomous/i],
  ['Nature & Animals', /animal|plant|caterpillar|narwhal|habitat|ecosystem|ecology|biodivers|conservation|species|ocean|forest|wildlife/i],
  ['Earth & Space', /earth|weather|climate|rock|volcano|ocean|space|planet|star|solar/i],
  ['Science & Engineering', /science|experiment|energy|force|machine|engineering|invent|material|physics|chemistry/i],
  ['FLL & Teamwork', /fll|first lego league|bioglow|project|core value|teamwork|presentation/i],
];
const categoryFor = question => categories.find(([, matcher]) => matcher.test(question))?.[0] || 'Other curiosity';

if (config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) {
  state.textContent = 'Research with AI is unavailable right now.';
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    state.innerHTML = 'Sign in to view Research with AI. <a href="login.html">Sign in</a>';
  } else {
    const { data: profile } = await db.from('profiles').select('role,approval_status').eq('id', session.user.id).maybeSingle();
    if (!profile || profile.approval_status !== 'approved') {
      state.textContent = 'Coach approval is required to view Research with AI.';
    } else {
      const canManage = ['coach', 'student_coach'].includes(profile.role);
      const canIdentifyAuthors = canManage;
      let questions = [];
      let activeCategory = 'All questions';

      const render = async () => {
        const { data, error } = await db.from('questions')
          .select('id,question,ai_answer,created_at,author_id')
          .not('ai_answer', 'is', null)
          .order('created_at', { ascending: false });
        if (error) {
          window.FIREFLIES_DIAGNOSTICS?.report('Research with AI', error);
          state.hidden = false;
          state.textContent = 'Research with AI is unavailable right now.';
          return;
        }
        questions = data || [];
        const names = new Map();
        if (canIdentifyAuthors && questions.length) {
          const ids = [...new Set(questions.map(item => item.author_id).filter(Boolean))];
          const { data: authors } = await db.from('profiles').select('id,display_name').in('id', ids);
          (authors || []).forEach(author => names.set(author.id, author.display_name));
        }
        const grouped = new Map();
        questions.forEach(item => { const category = categoryFor(item.question); grouped.set(category, [...(grouped.get(category) || []), item]); });
        const visible = activeCategory === 'All questions' ? questions : (grouped.get(activeCategory) || []);
        state.hidden = true;
        categoryList.innerHTML = [['All questions', questions], ...[...grouped.entries()]].map(([category, items]) => `<button class="${activeCategory === category ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}"><span>${escapeHtml(category)}</span><strong>${items.length}</strong></button>`).join('');
        list.innerHTML = visible.map(item => {
          const label = canIdentifyAuthors ? `Asked by ${escapeHtml(names.get(item.author_id) || 'Team member')}` : 'Team question';
          const remove = canManage ? `<button class="icon-delete" type="button" data-remove-question="${item.id}" aria-label="Delete question" title="Delete question"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v10m4-10v10m4-10v10M5 6h14m-9-3h4l1 3H9l1-3Zm-4 3 1 14h10l1-14"/></svg></button>` : '';
          return `<article class="card research-question"><div class="research-question-head"><span class="status-chip">${label}</span>${remove}</div><h2>${escapeHtml(item.question)}</h2><p class="ai-answer">${formatAnswer(item.ai_answer)}</p><small class="muted">${new Date(item.created_at).toLocaleDateString()}</small></article>`;
        }).join('') || '<p class="muted">No questions in this topic yet.</p>';
        categoryList.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { activeCategory = button.dataset.category; render(); }));
        list.querySelectorAll('[data-remove-question]').forEach(button => button.addEventListener('click', async () => {
          if (!confirm('Remove this question and its answer?')) return;
          const { error } = await db.from('questions').delete().eq('id', button.dataset.removeQuestion);
          if (error) { state.hidden = false; state.textContent = 'That question could not be removed right now.'; return; }
          render();
        }));
      };
      render();
    }
  }
}
