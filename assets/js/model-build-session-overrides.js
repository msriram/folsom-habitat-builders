const sessionNumber = Number(document.body.dataset.session?.match(/meeting-(\d+)/)?.[1]);

const plans = {
  4: {
    title: 'Mission models: M8, M9, and the M13–M15 bases',
    intro: 'Finish the next essential mission models before investing more time in attachments: build the large M8/M9 tree house together, then begin the three bases for Missions 13, 14, and 15.',
    agenda: [
      '<strong>10 min</strong> Inventory the bags, instructions, and table locations for M8, M9, M13, M14, and M15. Confirm that Mission 14 itself is already built.',
      '<strong>35 min</strong> A 2–3 student build crew assembles the large M8/M9 tree house while the rest of the team sorts, checks, and stages parts.',
      '<strong>25 min</strong> Build and place the three mission bases for M13, M14, and M15. Record any missing parts or unclear instruction step.',
      '<strong>10 min</strong> Operate the finished tree house and check each base against the field placement and reset instructions.',
      '<strong>10 min</strong> Label what is complete, what needs a final step, and who will continue M13 and M15 in Session 5.'
    ],
    done: ['The M8/M9 large tree house is built and its motion is checked', 'The M13, M14, and M15 mission bases are built and placed correctly', 'Mission 14 remains recorded as already built', 'Any unfinished M13 or M15 model work has a named next build owner']
  },
  5: {
    title: 'Finish M13 and M15, then check the field',
    intro: 'Complete the remaining Mission 13 and Mission 15 models, finish any M13–M15 base work carried from Session 4, and operate/reset each completed model before returning to attachment design.',
    agenda: [
      '<strong>10 min</strong> Review the Session 4 build record: M8/M9 tree house, all three bases, and the exact remaining M13 or M15 steps.',
      '<strong>30 min</strong> Build and finish Mission 13 with a small crew; check that it resets and moves as intended.',
      '<strong>30 min</strong> Build and finish Mission 15 with a second small crew; complete any base correction before testing its operation.',
      '<strong>10 min</strong> Walk through M13, M14, and M15 together: correct table location, reset position, moving parts, and no missing pieces.',
      '<strong>10 min</strong> Update the mission inventory and choose one model action to investigate for the next robot attachment plan.'
    ],
    done: ['Mission 13 is built, placed, and reset correctly', 'Mission 15 is built, placed, and reset correctly', 'The M13, M14, and M15 bases are complete and checked together', 'The team records one next model action for a future attachment or robot test']
  }
};

const plan = plans[sessionNumber];
if (plan) {
  const heading = document.querySelector('.meeting-head h1');
  const intro = document.querySelector('.meeting-head p');
  const agenda = document.querySelector('.agenda');
  const doneHeading = [...document.querySelectorAll('main h2')].find(item => /^(Definition of done|Goals)$/.test(item.textContent.trim()));
  const checklist = doneHeading?.nextElementSibling;
  if (heading) heading.textContent = plan.title;
  if (intro) intro.textContent = plan.intro;
  if (agenda) agenda.innerHTML = plan.agenda.map(item => `<li>${item}</li>`).join('');
  if (doneHeading) doneHeading.textContent = 'Definition of done';
  if (checklist?.matches('ul')) checklist.innerHTML = plan.done.map(item => `<li>${item}</li>`).join('');
}
