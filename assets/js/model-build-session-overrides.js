const sessionNumber = Number(document.body.dataset.session?.match(/meeting-(\d+)/)?.[1]);

const plans = {
  4: {
    title: 'Model recap and mission trial runs',
    intro: 'The team used this session to review what is built and practice mission runs: Mission 1 and Mission 5 partially, plus Missions 3 and 6. The team also began Mission 13.',
    agenda: [
      '<strong>10 min</strong> Recap the completed mission models and agree on the starting/reset position for each practice run.',
      '<strong>20 min</strong> Practice Mission 1 (Drone Survey) and note what worked plus the next step for the partial run.',
      '<strong>20 min</strong> Practice Mission 3 (Flip the Rock) and record the release, contact, and reset observations.',
      '<strong>20 min</strong> Practice Mission 5 (Reaching Roots) and Mission 6 (Leafcutter Frenzy); note partial progress and the next reliable action.',
      '<strong>15 min</strong> Begin the Mission 13 model build and set aside the parts and instructions for the next session.',
      '<strong>5 min</strong> Record the trial-run lessons and list the model-build work carried into Session 5.'
    ],
    done: ['Mission 1, Mission 3, Mission 5, and Mission 6 trial runs are recorded', 'Partial work and the next step for Missions 1 and 5 are clear', 'Mission 13 has been started', 'All unfinished model-build work is queued for Session 5']
  },
  5: {
    title: 'Finish the carried-over field builds',
    intro: 'Complete the model-building work that was planned for Session 4: the M8/M9 tree house, the M13–M15 bases, and the remaining Mission 13 and Mission 15 steps. Then check every model’s placement and reset.',
    agenda: [
      '<strong>10 min</strong> Review the carry-over list, split into build crews, and stage the bags, instructions, and table locations.',
      '<strong>30 min</strong> Build the M8/M9 large tree house and verify that its motion works as the instructions show.',
      '<strong>20 min</strong> Build and place the Mission 13, Mission 14, and Mission 15 bases; Mission 14 is already built, but its base still needs checking.',
      '<strong>20 min</strong> Continue Mission 13 and build or finish Mission 15. Verify placement, motion, and reset for each completed model.',
      '<strong>10 min</strong> Check the M8/M9 tree house and the three base reset positions together; record any final missing step or future robot action.'
    ],
    done: ['The M8/M9 large tree house is built and its motion is checked', 'The Mission 13, Mission 14, and Mission 15 bases are built and placed', 'Mission 13 and Mission 15 are finished as far as time allows, with resets checked', 'Any remaining model step has a named owner and next session']
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
