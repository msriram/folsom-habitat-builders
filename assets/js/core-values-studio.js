const config = window.FIREFLIES_PORTAL_CONFIG || {};
const state = document.querySelector('[data-core-studio-state]');
const storyList = document.querySelector('[data-core-story-turns]');
const quizList = document.querySelector('[data-core-quiz-list]');
const storyForm = document.querySelector('[data-core-story-form]');
const quizForm = document.querySelector('[data-core-quiz-form]');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

if (config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) {
  state.textContent = 'Core Values Studio is unavailable right now.';
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    state.innerHTML = 'Sign in to use the Core Values Studio. <a href="login.html">Sign in</a>';
  } else {
    const { data: profile } = await db.from('profiles').select('id,role,approval_status,is_active').eq('id', session.user.id).maybeSingle();
    if (!profile || profile.approval_status !== 'approved' || !profile.is_active) {
      state.textContent = 'Coach approval is required to use the Core Values Studio.';
    } else {
      const canPost = ['student', 'coach', 'student_coach'].includes(profile.role);
      const canModerate = ['coach', 'student_coach'].includes(profile.role);
      state.hidden = true;
      if (canPost) { storyForm.hidden = false; quizForm.hidden = false; }
      const namesFor = async rows => {
        const ids = [...new Set(rows.map(row => row.author_id).filter(Boolean))];
        if (!ids.length) return new Map();
        const { data } = await db.from('profiles').select('id,display_name').in('id', ids);
        return new Map((data || []).map(item => [item.id, item.display_name || 'Team member']));
      };
      const render = async () => {
        const [{ data: turns, error: storyError }, { data: cards, error: cardError }] = await Promise.all([
          db.from('core_values_story_turns').select('id,body,author_id,created_at').order('created_at'),
          db.from('core_values_quiz_cards').select('id,question,answer,author_id,created_at').order('created_at', { ascending: false })
        ]);
        if (storyError || cardError) {
          const missing = /does not exist|schema cache/i.test(storyError?.message || cardError?.message || '');
          state.hidden = false;
          state.textContent = missing ? 'Core Values Studio is being set up. Please try again shortly.' : 'Core Values Studio could not be loaded right now.';
          return;
        }
        const names = await namesFor([...(turns || []), ...(cards || [])]);
        storyList.innerHTML = (turns || []).map((turn, index) => `<article class="core-story-turn"><span>Turn ${index + 1} · ${esc(names.get(turn.author_id) || 'Team member')}</span><p>${esc(turn.body)}</p>${canModerate ? `<button class="text-action" type="button" data-delete-story="${turn.id}">Remove</button>` : ''}</article>`).join('') || '<p class="muted">Be the first teammate to add to the story.</p>';
        quizList.innerHTML = (cards || []).map(card => `<article class="core-quiz-card"><span>${esc(names.get(card.author_id) || 'Team member')} asks</span><h3>${esc(card.question)}</h3><button class="button secondary core-reveal" type="button">Reveal answer</button><p class="core-quiz-answer" hidden>${esc(card.answer)}</p>${canModerate ? `<button class="text-action" type="button" data-delete-card="${card.id}">Remove</button>` : ''}</article>`).join('') || '<p class="muted">No challenge cards yet. Add one for the team.</p>';
        quizList.querySelectorAll('.core-reveal').forEach(button => button.addEventListener('click', () => { const answer = button.parentElement.querySelector('.core-quiz-answer'); answer.hidden = !answer.hidden; button.textContent = answer.hidden ? 'Reveal answer' : 'Hide answer'; }));
        if (canModerate) {
          storyList.querySelectorAll('[data-delete-story]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Remove this story turn?')) return; await db.from('core_values_story_turns').delete().eq('id', button.dataset.deleteStory); render(); }));
          quizList.querySelectorAll('[data-delete-card]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Remove this challenge card?')) return; await db.from('core_values_quiz_cards').delete().eq('id', button.dataset.deleteCard); render(); }));
        }
      };
      storyForm?.addEventListener('submit', async event => { event.preventDefault(); const message = storyForm.querySelector('[data-core-story-message]'); const body = storyForm.body.value.trim(); if (!body) return; const { error } = await db.from('core_values_story_turns').insert({ body }); if (error) { message.textContent = 'Your story turn could not be saved.'; return; } storyForm.reset(); message.textContent = 'Added to the team story.'; render(); });
      quizForm?.addEventListener('submit', async event => { event.preventDefault(); const message = quizForm.querySelector('[data-core-quiz-message]'); const question = quizForm.question.value.trim(); const answer = quizForm.answer.value.trim(); if (!question || !answer) return; const { error } = await db.from('core_values_quiz_cards').insert({ question, answer }); if (error) { message.textContent = 'Your challenge card could not be saved.'; return; } quizForm.reset(); message.textContent = 'Challenge card posted.'; render(); });
      render();
    }
  }
}
