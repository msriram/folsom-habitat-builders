// Keep the visible homework rhythm tied to the season calendar.  The team season
// starts on Sunday, August 2, 2026, so the active week changes at local midnight
// each Sunday without requiring a content edit or deployment.
const SEASON_START = new Date(2026, 7, 2);
const DAY = 24 * 60 * 60 * 1000;

const fallbackAssignments = {
  0: { title: 'Explore biodiversity and understand the game', due: 'Wednesday, August 5', priority: 'Finish the biodiversity paragraph and bring one rules question to Session 1.' },
  1: { title: 'Read the official slides and prepare for our first practice', due: 'Wednesday, August 12', priority: 'Read the Introduction and Session 1 decks, then bring one thing to build, one thing to test, and one question.' },
  2: { title: 'Choose a team name and a cause anchor', due: 'Wednesday, August 19', priority: 'Connect our biodiversity interests to a team name, a cause, and one question we can investigate together.' }
};

function currentWeek() {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((date - SEASON_START) / (7 * DAY)));
}

function formatDue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function applyRhythm() {
  const week = currentWeek();
  const coreValues = ['Discovery', 'Innovation', 'Impact', 'Inclusion', 'Teamwork', 'Fun'];
  const coreIndex = week - 2;
  const scheduledOverride = week === 4 ? ['Fun', 2] : null;
  const coreActivity = scheduledOverride?.[1] ?? (coreIndex >= 0 ? Math.floor(coreIndex / coreValues.length) + 1 : 0);
  const coreValue = scheduledOverride?.[0] ?? (coreIndex >= 0 ? coreValues[coreIndex % coreValues.length] : '');
  const groupOnly = new Set(['innovation-2', 'innovation-3', 'inclusion-1', 'teamwork-2', 'teamwork-3']);
  const coreKey = `${coreValue.toLowerCase()}-${coreActivity}`;
  const coreQuestions = {
    'discovery-1': 'What is one new thing you discovered this week, and what question do you want to investigate next?',
    'innovation-1': 'Describe one creative way our team could solve a biodiversity problem. What would we test first?',
    'impact-1': 'How could our robot, project, or team make a positive impact on biodiversity or our community?',
    'teamwork-1': 'Write each teammate’s name, one thing you think they do well, and one skill or habit they could improve. Be specific and kind.',
    'fun-1': 'Draw something about our team and include everyone if possible. You may draw by hand or digitally and upload the picture.',
    'fun-2': 'Draw something about our team and include everyone if possible. You may draw by hand or digitally and upload the picture.'
  };
  const coreQuestion = coreQuestions[coreKey] || `What did you learn about ${coreValue} this week, and how can our team show it in practice?`;
  const coreLink = document.querySelector('[data-core-values-link]');
  const coreTitle = document.querySelector('[data-core-values-title]');
  const coreNote = document.querySelector('[data-core-values-note]');
  const coreSmall = document.querySelector('[data-core-values-small]');
  let coreQuestionNode = document.querySelector('[data-core-values-question]');
  if (!coreQuestionNode) {
    const prompt = document.querySelector('[data-core-values-activity] .cell-prompt');
    if (prompt) { coreQuestionNode = document.createElement('p'); coreQuestionNode.dataset.coreValuesQuestion = ''; prompt.appendChild(coreQuestionNode); }
  }
  if (coreLink && coreTitle && coreActivity >= 1 && coreActivity <= 3) {
    const slug = coreValue.toLowerCase();
    coreLink.href = coreKey === 'teamwork-1' || coreKey === 'fun-1' ? 'portal.html?tab=homework#core-values-teamwork-1' : `downloads/bioglow/core-values-${slug}-${coreActivity}.pdf`;
    coreTitle.textContent = coreKey === 'teamwork-1' ? 'Teamwork · Activity 1: Team strengths ↗' : coreKey === 'fun-1' ? 'Fun · Activity 1: Team portrait ↗' : `${coreValue} · Activity ${coreActivity} ↗`;
    const teamOnly = groupOnly.has(coreKey);
    coreLink.hidden = true;
    if (coreNote) coreNote.textContent = teamOnly ? 'This page is a group activity and is not assigned as individual homework. The coach will use it during a team practice.' : coreKey === 'teamwork-1' ? 'Write each teammate’s name, what you think they are good at, and one skill or habit they could improve. Be specific and kind.' : coreKey === 'fun-1' ? 'Draw something about your team and include everyone if possible. You can draw by hand, use a digital tool, or upload the finished picture with your homework.' : 'Use this as a team meeting activity; it is shared work rather than individual homework.';
    if (coreSmall) coreSmall.textContent = teamOnly ? 'Team practice only' : coreKey === 'teamwork-1' ? 'Open the team strengths prompt' : coreKey === 'fun-1' ? 'Open the team portrait prompt' : 'Open the one-page activity worksheet';
    if (coreQuestionNode) coreQuestionNode.textContent = teamOnly ? 'This is a group activity for team practice, not individual homework.' : coreQuestion;
  }
  const assignments = { ...fallbackAssignments };
  document.body.dataset.currentHomeworkWeek = String(week);

  const details = [...document.querySelectorAll('details[data-homework-week]')];
  details.forEach(detail => {
    const number = Number(detail.dataset.homeworkWeek);
    const active = number === week;
    detail.classList.toggle('homework-current', active);
    detail.classList.toggle('homework-past', number < week);
    detail.classList.toggle('homework-future', number > week);
    detail.open = active;
    const summary = detail.querySelector('summary');
    const label = summary?.querySelector('span');
    const due = summary?.querySelector('strong');
    const heading = summary?.querySelector('h3');
    const assignment = assignments[number];
    if (assignment && heading) heading.textContent = assignment.title;
    if (assignment && due) due.textContent = `Due ${assignment.due}`;
    if (label) label.textContent = `Week ${number} · ${active ? 'This week' : number < week ? 'Previous week' : 'Next week'}`;
    const gateHeading = detail.querySelector('[data-homework-gate] h3');
    if (gateHeading) gateHeading.textContent = `Turn in Week ${number}`;
  });

  const current = assignments[week] || assignments[Math.max(...Object.keys(assignments).map(Number))];
  const next = assignments[week + 1];
  const setText = (selector, value) => { const node = document.querySelector(selector); if (node && value) node.textContent = value; };
  setText('#dashboard-current-assignment', current.title);
  setText('#dashboard-current-due', current.due);
  setText('#dashboard-priorities', current.priority);
  setText('#dashboard-next-assignment', next?.title || 'Next assignment will appear when it is published.');
  setText('#dashboard-next-due', next?.due || 'To be announced');
  setText('[data-homework-rhythm-label]', `Week ${week} · This week`);
  setText('[data-homework-rhythm-status]', `Week ${week} is active now; the next week opens automatically on Sunday.`);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyRhythm, { once: true });
else applyRhythm();
