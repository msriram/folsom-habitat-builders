// Keep the visible homework rhythm tied to the season calendar.  The team season
// starts on Sunday, August 2, 2026, so the active week changes at local midnight
// each Sunday without requiring a content edit or deployment.
const SEASON_START = new Date(2026, 7, 2);
const DAY = 24 * 60 * 60 * 1000;

const fallbackAssignments = {
  0: { title: 'Explore biodiversity and understand the game', due: 'Friday, August 7', priority: 'Finish the biodiversity paragraph and bring one rules question to Session 1.' },
  1: { title: 'Read the official slides and prepare for our first practice', due: 'Friday, August 14', priority: 'Read the Introduction and Session 1 decks, then bring one thing to build, one thing to test, and one question.' },
  2: { title: 'Choose a team name and a cause anchor', due: 'Friday, August 21', priority: 'Connect our biodiversity interests to a team name, a cause, and one question we can investigate together.' }
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
  const assignments = { ...fallbackAssignments };
  document.body.dataset.homeworkWeek = String(week);

  const details = [...document.querySelectorAll('[data-homework-week]')];
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

