const PACIFIC_TIME_ZONE = 'America/Los_Angeles';

const sessions = [
  { number: 1, date: '2026-08-14', title: 'Field and robot baseline', summary: 'Build the first mechanisms, use basic SPIKE movement programming, and record baseline observations.', focus: 'Turn the field and base robot into a reliable starting point: build, measure, run baseline movement tests, and record what the team learns.' },
  { number: 2, date: '2026-08-21', title: 'Build, measure, and establish Habitat Builders', summary: 'Continue builds, measure the board, and map a useful distance to repeatable motor movement.', focus: 'Build more models, measure the table and robot, run early trials, and record what Habitat Builders means to the team.' },
  { number: 3, date: '2026-08-28', title: 'Build, test, and BIOGLOW link', summary: 'Finish more models, improve measurements, and begin repeatable robot trials.', focus: 'Finish more mission models, check the measurements that matter, run repeatable robot trials, and connect Habitat Builders to a specific BIOGLOW question.' },
  { number: 4, date: '2026-09-04', title: 'Local biodiversity research directions', summary: 'Research promising local problems and gather useful sources.', focus: 'Compare local biodiversity problems, gather credible sources, and decide which unanswered question should guide the next research step.' },
  { number: 5, date: '2026-09-11', title: 'Research and existing solutions', summary: 'Compare sources and decide what solution direction is worth exploring.', focus: 'Learn from existing solutions, capture useful source details, and choose a project direction worth testing while the robot team practices a guided mission.' },
  { number: 6, date: '2026-09-18', title: 'Solution plan and pseudocode', summary: 'Plan the solution, write pseudocode, and test one robot mission program.', focus: 'Turn the project idea into a practical plan, write mission pseudocode, and test one change at a time on the field.' },
  { number: 7, date: '2026-09-25', title: 'Prototype and test', summary: 'Build or draw a prototype, then document robot and attachment tests.', focus: 'Create a first project prototype and use test evidence to improve one robot attachment or program.' },
  { number: 8, date: '2026-10-02', title: 'Feedback and iteration', summary: 'Collect feedback, revise the solution, and improve a robot program or attachment.', focus: 'Invite useful feedback, revise one part of the project, and make the robot plan more reliable with evidence.' },
  { number: 9, date: '2026-10-09', title: 'Impact and mission strategy', summary: 'Explain project impact, choose a mission strategy, and record the next improvement.', focus: 'Connect the project to real impact and choose robot missions that fit a reliable, timed strategy.' },
  { number: 10, date: '2026-10-16', title: 'Presentation draft', summary: 'Outline and rehearse the project presentation with clear evidence.', focus: 'Shape the team story around problem, research, solution, and impact while practicing a full robot run.' },
  { number: 11, date: '2026-10-23', title: 'Robot design explanation', summary: 'Prepare build, code, and testing evidence along with a short team celebration.', focus: 'Practice explaining how the robot was built, coded, and improved, with every student ready to share evidence.' },
  { number: 12, date: '2026-10-30', title: 'Full event rehearsal', summary: 'Practice judging, robot explanations, and event-day preparation.', focus: 'Rehearse the complete event experience, use recovery plans, and finish with a focused readiness checklist.' },
];

function pacificWallClock() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
}

function releaseTime(session) {
  const [year, month, day] = session.date.split('-').map(Number);
  return Date.UTC(year, month - 1, day + 1, 1, 0, 0); // Saturday, 1:00 AM Pacific
}

function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatDate(isoDate, style = 'long') {
  return new Intl.DateTimeFormat('en-US', { timeZone: PACIFIC_TIME_ZONE, month: style === 'short' ? 'short' : 'long', day: 'numeric' })
    .format(new Date(`${isoDate}T20:00:00Z`));
}

function currentSession() {
  const now = pacificWallClock();
  return sessions.find(session => now < releaseTime(session)) || sessions.at(-1);
}

function statusFor(session, active) {
  if (session.number < active.number) return 'past';
  if (session.number === active.number) return 'current';
  return 'upcoming';
}

function sessionHref(session) {
  return `meeting-${String(session.number).padStart(2, '0')}.html`;
}

function renderHome(active) {
  const next = document.querySelector('[data-next-session]');
  if (next) {
    next.querySelector('strong').textContent = `Session ${active.number} · ${active.title}`;
    next.querySelector('small').textContent = `Friday, ${formatDate(active.date)} · 6:00 PM · 90 minutes`;
    const link = next.querySelector('a');
    link.href = sessionHref(active);
    link.textContent = `Open Session ${active.number} plan`;
  }

  const upcoming = document.querySelector('[data-home-upcoming]');
  if (upcoming) {
    upcoming.innerHTML = sessions.filter(session => session.number >= active.number).slice(0, 3).map(session => {
      const state = statusFor(session, active);
      const marker = state === 'current' ? 'Current session →' : 'Upcoming →';
      return `<a class="meeting-row is-${state}-session" href="${sessionHref(session)}"><time>Fri<br>${formatDate(session.date, 'short')}</time><div><strong>Session ${session.number} · ${session.title}</strong><span>${session.summary}</span></div><span class="session-marker is-${state}">${marker}</span></a>`;
    }).join('');
  }

  const dueDate = addDays(active.date, -2);
  const cycleLabel = document.querySelector('[data-cycle-label]');
  const cycleTitle = document.querySelector('[data-cycle-title]');
  const cycleFocus = document.querySelector('[data-cycle-focus]');
  const cycleHomework = document.querySelector('[data-cycle-homework]');
  const homeworkLink = document.querySelector('[data-cycle-homework-link]');
  if (cycleLabel) cycleLabel.textContent = 'Current session cycle';
  if (cycleTitle) cycleTitle.textContent = `Session ${active.number} · ${active.title}`;
  if (cycleFocus) cycleFocus.textContent = active.focus;
  if (cycleHomework) cycleHomework.textContent = `Week ${active.number} homework is due Wednesday, ${formatDate(dueDate)}. Work through each task a little at a time and bring one observation or question.`;
  if (homeworkLink) {
    homeworkLink.href = `portal.html?tab=homework&week=${active.number}#homework`;
    homeworkLink.textContent = `Open Week ${active.number} homework`;
  }
}

function markSessionRows(active) {
  if (document.body.dataset.page !== 'Sessions') return;
  document.querySelectorAll('.meeting-row[href^="meeting-"]').forEach(row => {
    const match = row.getAttribute('href')?.match(/meeting-(\d+)/);
    const session = sessions.find(item => item.number === Number(match?.[1]));
    if (!session) return;
    const state = statusFor(session, active);
    row.dataset.sessionState = state;
    row.classList.remove('is-past-session', 'is-current-session', 'is-upcoming-session');
    row.classList.add(`is-${state}-session`);
    const time = row.querySelector('time');
    if (time) time.innerHTML = `Fri<br>${formatDate(session.date, 'short')}`;
    const marker = row.lastElementChild;
    if (marker) {
      marker.className = `session-marker is-${state}`;
      marker.textContent = state === 'past' ? 'Past session' : state === 'current' ? 'Current session' : 'Upcoming';
    }
  });
}

function updateSessionCycle() {
  const active = currentSession();
  renderHome(active);
  markSessionRows(active);
}

const sessionNumber = Number(document.body.dataset.session?.match(/meeting-(\d+)/)?.[1]);
if (sessionNumber) {
  const session = sessions.find(item => item.number === sessionNumber);
  const headerMeta = document.querySelector('.meeting-head span');
  if (session && headerMeta) headerMeta.textContent = `Session ${session.number} · Friday, ${formatDate(session.date)} · 6:00 PM · 90 minutes`;
  if (sessionNumber < sessions.length) {
    const homeworkWeek = sessionNumber + 1;
    document.querySelectorAll('a[href*="portal.html"][href*="homework"]').forEach(link => {
      link.href = `portal.html?tab=homework&week=${homeworkWeek}#homework`;
      link.textContent = `Open Week ${homeworkWeek} homework →`;
    });
  }
}

document.querySelectorAll('a[href="season.html"]').forEach(link => {
  if (link.textContent.includes('Schedule')) link.textContent = link.textContent.replace('Schedule', 'Sessions');
});
document.querySelectorAll('.status-chip').forEach(chip => {
  if ((chip.textContent || '').includes('Sunday')) chip.textContent = 'Friday · 6 PM';
});
document.querySelectorAll('h3').forEach(heading => {
  if (heading.textContent?.trim() === 'Sunday · Innovation and planning') heading.textContent = 'Friday · Innovation, robot, and planning';
});
document.querySelectorAll('p').forEach(paragraph => {
  if (paragraph.textContent?.includes('Sunday is the project and research meeting')) paragraph.textContent = 'Assignments are due Wednesday. Each Friday session produces the evidence and next decision for the following assignment.';
});
document.querySelectorAll('li').forEach(item => {
  if (item.textContent?.includes('Due Sunday')) item.innerHTML = '<strong>Due Wednesday:</strong> research, quizzes, coding, robot, and written work';
});

updateSessionCycle();
window.setInterval(updateSessionCycle, 60 * 1000);
