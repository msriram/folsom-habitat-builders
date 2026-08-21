const destinationTabs = document.querySelector('.portal-tabs');
const destinationPanels = document.querySelector('.portal-panels');

function activateDestination(name) {
  const button = document.querySelector(`[data-tab="${name}"]`);
  const panel = document.querySelector(`[data-panel="${name}"]`);
  if (!button || !panel) return;
  document.querySelectorAll('[data-tab],[data-panel]').forEach(element => element.classList.remove('active'));
  button.classList.add('active');
  panel.classList.add('active');
  history.replaceState(null, '', `#${name}`);
}

if (destinationTabs && destinationPanels) {
  const homeworkTab = destinationTabs.querySelector('[data-tab="homework"]');
  const coachPanel = destinationPanels.querySelector('[data-panel="coach"]');
  destinationTabs.querySelector('a[href="ai-questions.html"]')?.remove();
  const reviewsTab = document.createElement('button');
  reviewsTab.type = 'button';
  reviewsTab.dataset.tab = 'reviews';
  reviewsTab.textContent = 'Reviews';
  const researchTab = document.createElement('button');
  researchTab.type = 'button';
  researchTab.dataset.tab = 'research';
  researchTab.textContent = 'Research with AI';
  homeworkTab?.after(reviewsTab);
  reviewsTab.after(researchTab);

  const reviewsPanel = document.createElement('section');
  reviewsPanel.className = 'portal-panel';
  reviewsPanel.dataset.panel = 'reviews';
  reviewsPanel.innerHTML = `<div class="portal-heading"><div><span class="eyebrow">Team Room · shared learning</span><h2>Homework reviews</h2><p class="muted">Published reviews appear only after a coach has completed the full set.</p></div><button class="button primary" type="button" data-coach-review-open hidden>Review student work</button></div><div class="auth-state" data-reviews-state>Loading…</div><section class="section compact homework-review-page"><div class="review-toolbar" data-review-toolbar hidden><label>Published assignment<select data-review-assignment></select></label><span class="status-chip" data-review-count></span></div><div data-review-list class="review-rollup-list"><p class="muted">Sign in with an approved account to view published reviews.</p></div></section><section class="section compact" data-embedded-review-workspace hidden><div class="section-title"><div><span class="eyebrow">Coach workspace</span><h3>Review student work</h3><p class="muted">Read each response, leave helpful feedback, then publish after every student has a review decision.</p></div></div><div class="auth-state" data-review-state>Loading…</div><div class="publish-panel" data-publish-panel hidden><div><strong data-publish-status>Loading review status…</strong><p>Publishing shares written responses, coach feedback, and approved homework images with signed-in students and parents.</p></div><div class="hero-actions"><button class="button primary" data-publish-reviews disabled>Publish homework reviews</button><p class="form-message" data-publish-message aria-live="polite"></p></div></div><div class="review-shell" data-review-shell hidden><aside class="review-sidebar"><label>Assignment<select data-assignment-select></select></label><div data-student-tabs></div></aside><section class="review-detail" data-review-detail><h2>Select a student</h2></section></div></section>`;
  const coachWorkspace = reviewsPanel.querySelector('[data-embedded-review-workspace]');
  const reviewShell = coachWorkspace?.querySelector('[data-review-shell]');
  const publicationPanel = coachWorkspace?.querySelector('[data-publish-panel]');
  if (reviewShell && publicationPanel) publicationPanel.before(reviewShell);

  const researchPanel = document.createElement('section');
  researchPanel.className = 'portal-panel';
  researchPanel.dataset.panel = 'research';
  researchPanel.innerHTML = `<div class="portal-heading"><div><span class="eyebrow">Team learning</span><h2>Research with AI</h2><p class="muted">Questions and age-appropriate answers the team can learn from together.</p></div></div><div class="auth-state" data-ai-questions-state>Loading…</div><section class="section compact"><div class="research-layout"><aside class="research-categories"><h2>Topics</h2><div data-ai-category-list></div></aside><div class="stack" data-ai-questions-list></div></div></section>`;
  destinationPanels.insertBefore(reviewsPanel, coachPanel || null);
  destinationPanels.insertBefore(researchPanel, coachPanel || null);

  [reviewsTab, researchTab].forEach(tab => tab.addEventListener('click', () => activateDestination(tab.dataset.tab)));
  const openCoachReviews = () => {
    activateDestination('reviews');
    document.querySelector('[data-embedded-review-workspace]')?.removeAttribute('hidden');
    document.querySelector('[data-embedded-review-workspace]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  document.querySelector('[data-coach-review-open]')?.addEventListener('click', openCoachReviews);
  if (new URLSearchParams(location.search).get('mode') === 'coach') setTimeout(openCoachReviews, 0);
  const requestedTab = new URLSearchParams(location.search).get('tab') || location.hash.slice(1);
  if (['reviews', 'research'].includes(requestedTab)) setTimeout(() => activateDestination(requestedTab), 0);

  document.querySelectorAll('a[href="admin-homework.html"]').forEach(link => { link.href = 'portal.html?tab=reviews&mode=coach'; });
  document.querySelectorAll('a[href="homework-reviews.html"]').forEach(link => { link.href = 'portal.html?tab=reviews'; });
  document.querySelectorAll('a[href="ai-questions.html"]').forEach(link => { link.href = 'portal.html?tab=research'; });

  await import('./homework-reviews.js?v=team-room-review-order1');
  await import('./admin-homework.js?v=team-room-coach-state1');
  await import('./ai-questions.js?v=team-room-review-order1');
}
