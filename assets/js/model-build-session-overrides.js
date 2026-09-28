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
    intro: 'Completed: the M8/M9 tree house, Mission 13, Mission 15, field measurements, and robot trials. The field-build work is closed; it does not carry into Session 6.',
    agenda: [
      '<strong>10 min</strong> Review the carry-over list, split into build crews, and stage the bags, instructions, and table locations.',
      '<strong>30 min</strong> Build the M8/M9 large tree house and verify that its motion works as the instructions show.',
      '<strong>20 min</strong> Build and place the Mission 13, Mission 14, and Mission 15 bases; Mission 14 is already built, but its base still needs checking.',
      '<strong>20 min</strong> Continue Mission 13 and build or finish Mission 15. Verify placement, motion, and reset for each completed model.',
      '<strong>10 min</strong> Check the M8/M9 tree house and the three base reset positions together; record any final missing step or future robot action.'
    ],
    done: ['The M8/M9 large tree house is built and its motion is checked', 'Mission 13 and Mission 15 are built, placed, and reset-checked', 'Useful field measurements are recorded', 'Robot trial runs are recorded; no Session 5 field-build item carries forward']
  },
  6: {
    title: 'Build and test the first mission attachment',
    intro: 'This is the team’s first attachment-build and test session. Choose one mission action, build one simple attachment, measure only what that action needs, and collect evidence from controlled trials.',
    agenda: [
      '<strong>10 min</strong> Choose one completed mission model and state the exact action: push, pull, lift, guide, or carry.',
      '<strong>25 min</strong> Use the Week 6 drawings to build one simple attachment. Check its clearance from the wheels, hub, cables, and model before running it.',
      '<strong>15 min</strong> Measure and record the few values this action needs: launch reference, attachment reach, model contact point, or turning room.',
      '<strong>25 min</strong> Write a simple first program and run 3–5 controlled trials with the same home base, reset, and model position each time.',
      '<strong>15 min</strong> Record what happened on each run. Choose one specific change to plan for Session 7; do not redesign everything at once.'
    ],
    done: ['One attachment prototype is built and safely fitted to the robot', 'The launch reference, contact point, and any needed reach or turning measurement are recorded', 'Three to five controlled trials are recorded with the same reset conditions', 'The team chooses one evidence-based change to plan for Session 7']
  },
  7: {
    title: 'Build the first attachment and begin measured programming',
    intro: 'With the robot, field, and first attachment direction ready, Session 7 begins the attachment build, takes the measurements needed for it, and introduces pseudocode only when there is a real action to program.',
    agenda: [
      '<strong>15 min</strong> Recheck the base robot, field models, and the chosen attachment drawing before building.',
      '<strong>30 min</strong> Build the first attachment prototype and confirm it clears the wheels, hub, cables, and field models.',
      '<strong>20 min</strong> Measure the attachment reach, launch reference, and model contact point; record values for the first test.',
      '<strong>15 min</strong> Write simple pseudocode for the one attachment action, then create the first SPIKE program.',
      '<strong>10 min</strong> Run a few exploratory trials and record what to improve before making a formal reliability plan.'
    ],
    done: ['First attachment prototype is built and safely fitted', 'Key dimensions and launch reference are recorded', 'One attachment action has simple pseudocode and a first program', 'Early trial observations identify the next single change']
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
