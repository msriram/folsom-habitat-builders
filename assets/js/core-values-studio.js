const config = window.FIREFLIES_PORTAL_CONFIG || {};
const state = document.querySelector('[data-core-studio-state]');
const storyList = document.querySelector('[data-core-story-turns]');
const quizList = document.querySelector('[data-core-quiz-list]');
const storyForm = document.querySelector('[data-core-story-form]');
const quizForm = document.querySelector('[data-core-quiz-form]');
const gameList = document.querySelector('[data-core-game-list]');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const games = [
  ['all', 'All games', 'Every Core Values question the team has created.'],
  ['teamwork_move', 'Teamwork Move', 'What could the team do when people have different ideas or jobs?'],
  ['kind_coach', 'Kind Coach', 'Practice a helpful, specific way to encourage or give feedback.'],
  ['value_detective', 'Value Detective', 'Spot the Core Value shown in a real or imagined team moment.'],
  ['scenario_choice', 'What would you do?', 'Think through a tricky robot, project, or team situation together.'],
  ['celebrate', 'Celebrate a teammate', 'Recognize a helpful action and explain why it mattered.']
];

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
      const canPost = ['student', 'parent', 'coach', 'student_coach'].includes(profile.role);
      const canModerate = ['coach', 'student_coach'].includes(profile.role);
      let activeGame = 'all';
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
          db.from('core_values_quiz_cards').select('id,question,answer,category,author_id,created_at').order('created_at', { ascending: false })
        ]);
        if (storyError || cardError) {
          const missing = /does not exist|schema cache/i.test(storyError?.message || cardError?.message || '');
          state.hidden = false;
          state.textContent = missing ? 'Core Values Studio is being set up. Please try again shortly.' : 'Core Values Studio could not be loaded right now.';
          return;
        }
        const { data: answers, error: answerError } = (cards || []).length
          ? await db.from('core_values_quiz_answers').select('id,card_id,body,author_id,created_at').in('card_id', cards.map(card => card.id)).order('created_at')
          : { data: [], error: null };
        if (answerError) { state.hidden = false; state.textContent = 'Core Values Studio is being set up. Please try again shortly.'; return; }
        const names = await namesFor([...(turns || []), ...(cards || []), ...(answers || [])]);
        const answersByCard = new Map();
        (answers || []).forEach(answer => answersByCard.set(answer.card_id, [...(answersByCard.get(answer.card_id) || []), answer]));
        const game = games.find(([id]) => id === activeGame) || games[0];
        document.querySelector('[data-core-game-label]').textContent = activeGame === 'all' ? 'Quiz each other' : 'Core Values game';
        document.querySelector('[data-core-game-title]').textContent = activeGame === 'all' ? 'Core Values challenge cards' : game[1];
        document.querySelector('[data-core-game-description]').textContent = game[2];
        gameList.innerHTML = games.map(([id, label]) => { const count = id === 'all' ? cards.length : cards.filter(card => card.category === id).length; return `<button class="${activeGame === id ? 'active' : ''}" type="button" data-core-game="${id}"><span>${esc(label)}</span><strong>${count}</strong></button>`; }).join('');
        gameList.querySelectorAll('[data-core-game]').forEach(button => button.addEventListener('click', () => { activeGame = button.dataset.coreGame; render(); }));
        storyList.innerHTML = (turns || []).map((turn, index) => `<article class="core-story-turn"><span>Turn ${index + 1} · ${esc(names.get(turn.author_id) || 'Team member')}</span><p>${esc(turn.body)}</p>${canModerate ? `<button class="text-action" type="button" data-delete-story="${turn.id}">Remove</button>` : ''}</article>`).join('') || '<p class="muted">Be the first teammate to add to the story.</p>';
        quizList.innerHTML = (activeGame === 'all' ? cards : cards.filter(card => card.category === activeGame)).map(card => { const answersHtml = (answersByCard.get(card.id) || []).map(answer => `<li><strong>${esc(names.get(answer.author_id) || 'Team member')}:</strong> ${esc(answer.body)}</li>`).join('') || '<li class="muted">No teammate answers yet.</li>'; const answerForm = canPost ? `<form class="core-answer-form" data-card-id="${card.id}"><label>Your answer<textarea name="body" rows="3" maxlength="700" required placeholder="Share your own idea before revealing the card author’s answer."></textarea></label><button class="button secondary" type="submit">Add answer</button><p class="form-message" aria-live="polite"></p></form>` : ''; return `<article class="core-quiz-card"><span>${esc(games.find(([id]) => id === card.category)?.[1] || 'Core Values game')} · ${esc(names.get(card.author_id) || 'Team member')} asks</span><h3>${esc(card.question)}</h3>${answerForm}<div class="core-answer-thread"><strong>Team answers</strong><ul>${answersHtml}</ul></div><button class="button secondary core-reveal" type="button">Reveal card author’s answer</button><p class="core-quiz-answer" hidden>${esc(card.answer)}</p>${canModerate ? `<button class="text-action" type="button" data-delete-card="${card.id}">Remove question</button>` : ''}</article>`; }).join('') || '<p class="muted">No questions in this game yet. Try one of the starter ideas, then add the first card.</p>';
        quizList.querySelectorAll('.core-reveal').forEach(button => button.addEventListener('click', () => { const answer = button.parentElement.querySelector('.core-quiz-answer'); answer.hidden = !answer.hidden; button.textContent = answer.hidden ? 'Reveal answer' : 'Hide answer'; }));
        quizList.querySelectorAll('.core-answer-form').forEach(form => form.addEventListener('submit', async event => { event.preventDefault(); const message = form.querySelector('.form-message'); const body = form.body.value.trim(); if (!body) return; const { error } = await db.from('core_values_quiz_answers').insert({ card_id: form.dataset.cardId, body }); if (error) { message.textContent = 'Your answer could not be saved.'; return; } render(); }));
        if (canModerate) {
          storyList.querySelectorAll('[data-delete-story]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Remove this story turn?')) return; await db.from('core_values_story_turns').delete().eq('id', button.dataset.deleteStory); render(); }));
          quizList.querySelectorAll('[data-delete-card]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Remove this challenge card?')) return; await db.from('core_values_quiz_cards').delete().eq('id', button.dataset.deleteCard); render(); }));
        }
      };
      storyForm?.addEventListener('submit', async event => { event.preventDefault(); const message = storyForm.querySelector('[data-core-story-message]'); const body = storyForm.body.value.trim(); if (!body) return; const { error } = await db.from('core_values_story_turns').insert({ body }); if (error) { message.textContent = 'Your story turn could not be saved.'; return; } storyForm.reset(); message.textContent = 'Added to the team story.'; render(); });
      quizForm?.addEventListener('submit', async event => { event.preventDefault(); const message = quizForm.querySelector('[data-core-quiz-message]'); const question = quizForm.question.value.trim(); const answer = quizForm.answer.value.trim(); const category = quizForm.category.value; if (!question || !answer) return; const { error } = await db.from('core_values_quiz_cards').insert({ question, answer, category }); if (error) { message.textContent = 'Your challenge card could not be saved.'; return; } quizForm.reset(); message.textContent = 'Challenge card posted.'; render(); });
      render();
    }
  }
}
