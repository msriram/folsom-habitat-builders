const recordConfig = window.FIREFLIES_PORTAL_CONFIG || {};
const recordTab = document.querySelector('[data-tab="robot"]');
const recordPanelAnchor = document.querySelector('[data-panel="robot"]');
const robotRecordsStyle = document.createElement('style');
robotRecordsStyle.textContent = '.robot-record-form{display:grid;gap:12px}.robot-record-form label{display:grid;gap:6px;font-weight:800}.robot-record-form input,.robot-record-form select,.robot-record-form textarea{width:100%;box-sizing:border-box;padding:.7rem;border:1px solid var(--border);border-radius:8px;background:var(--paper);color:var(--ink);font:inherit}.robot-record-form textarea{resize:vertical}.robot-record-form .grid{margin:0}.robot-record-form .form-message{margin:0}';
document.head.append(robotRecordsStyle);

if (recordTab && recordPanelAnchor) {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.dataset.tab = 'robot-records';
  tab.textContent = 'Robot Records';
  const panel = document.createElement('section');
  panel.className = 'portal-panel';
  panel.dataset.panel = 'robot-records';
  panel.innerHTML = `<div class="portal-heading"><div><span class="eyebrow">Measure · align · test · improve</span><h2>Robot Records</h2><p class="muted">Use real measurements and repeated trials. Keep one clear starting reference, change one variable at a time, and save the evidence.</p></div></div><section class="callout"><h3>Reliable alignment habits</h3><p>Record the actual field and robot measurements, use a repeatable launch reference, and test the same program several times before trusting it. A fast mission is useful only if it repeats.</p></section><div class="grid two"><section class="plain-panel"><div class="section-title"><div><span class="eyebrow">Shared baseline</span><h3>Field and base robot setup</h3></div></div><form id="robot-setup-form" class="robot-record-form"><div class="grid two"><label>Table length (mm)<input name="table_length_mm" type="number" min="1" step="0.1" placeholder="Measure actual table"></label><label>Table width (mm)<input name="table_width_mm" type="number" min="1" step="0.1" placeholder="Measure actual table"></label><label>Robot length (mm)<input name="robot_length_mm" type="number" min="1" step="0.1"></label><label>Robot width (mm)<input name="robot_width_mm" type="number" min="1" step="0.1"></label><label>Robot height (mm)<input name="robot_height_mm" type="number" min="1" step="0.1"></label><label>Wheel diameter (mm)<input name="wheel_diameter_mm" type="number" min="1" step="0.1"></label><label>Measured distance / motor rotation (mm)<input name="distance_per_motor_rotation_mm" type="number" min="0.1" step="0.1"></label><label>Motor rotations for a 90° turn<input name="turn_90_motor_rotations" type="number" min="0.1" step="0.01"></label><label>Drive motor ports<input name="drive_motor_ports" placeholder="Example: A + B"></label><label>Gear ratio / wheel setup<input name="gear_ratio" placeholder="Example: direct drive"></label></div><label>Launch alignment reference<textarea name="launch_alignment_notes" rows="4" placeholder="Which wall, line, corner, or guide does the robot touch before launch? How should it be squared?"></textarea></label><label>Gyro and sensor notes<textarea name="gyro_and_sensor_notes" rows="4" placeholder="Gyro reset routine, color-sensor settings, lighting notes, or distance-sensor conditions."></textarea></label><button class="button primary" type="submit">Save shared setup</button><p class="form-message" data-setup-message></p></form></section><section class="plain-panel"><div class="section-title"><div><span class="eyebrow">Calibration trial</span><h3>Drive, turn, sensor, or alignment test</h3></div></div><form id="robot-calibration-form" class="robot-record-form"><label>Test type<select name="test_kind"><option value="straight_drive">Straight drive</option><option value="turn">Turn</option><option value="line_or_sensor">Line or sensor</option><option value="launch_alignment">Launch alignment</option><option value="attachment">Attachment</option></select></label><label>Test name<input name="test_name" required placeholder="Example: 500 mm wall-square drive"></label><div class="grid two"><label>Target value<input name="target_value" type="number" step="0.1" placeholder="500"></label><label>Actual value<input name="actual_value" type="number" step="0.1" placeholder="493"></label><label>Unit<select name="unit"><option value="mm">mm</option><option value="degrees">degrees</option><option value="seconds">seconds</option><option value="rotations">rotations</option><option value="other">other</option></select></label><label>Motor rotations<input name="motor_rotations" type="number" step="0.01"></label></div><label>Starting reference<input name="start_reference" placeholder="Example: left wheel against launch wall"></label><label>What happened?<textarea name="observation" rows="4" placeholder="Include drift direction, overshoot, sensor reading, or alignment result."></textarea></label><button class="button primary" type="submit">Save calibration trial</button><p class="form-message" data-calibration-message></p></form></section></div><section class="section compact"><div class="section-title"><div><span class="eyebrow">Mission evidence</span><h3>Attachment and mission run log</h3><p class="muted">Record the score, time, reliability, attachment, program, and the one change to test next.</p></div></div><form id="robot-mission-form" class="card robot-record-form"><div class="grid three"><label>Mission / route<input name="mission" required placeholder="Example: M05 + return home"></label><label>Attachment<input name="attachment_name" placeholder="Example: guided hook v2"></label><label>Program name<input name="program_name" placeholder="Example: right-field-v1"></label><label>Launch reference<input name="launch_reference" placeholder="Example: squared to right wall"></label><label>Planned points<input name="planned_points" type="number" min="0" step="1"></label><label>Observed points<input name="observed_points" type="number" min="0" step="1"></label><label>Attempts<input name="attempts" type="number" min="1" value="5" required></label><label>Successes<input name="successes" type="number" min="0" value="0" required></label><label>Fastest run (seconds)<input name="fastest_run_seconds" type="number" min="0" step="0.1"></label><label>Average run (seconds)<input name="average_run_seconds" type="number" min="0" step="0.1"></label></div><label>Result notes<textarea name="result_notes" rows="3" placeholder="What made it work or fail? Include resets, missed models, or timing details."></textarea></label><label>Next single change<textarea name="next_change" rows="3" placeholder="Change one thing for the next test: alignment, speed, distance, attachment, or code."></textarea></label><button class="button primary" type="submit">Save mission record</button><p class="form-message" data-mission-message></p></form><div class="table-wrap"><table><thead><tr><th>Mission / route</th><th>Attachment</th><th>Points</th><th>Reliability</th><th>Fastest</th><th>Next change</th></tr></thead><tbody data-mission-records><tr><td colspan="6">Sign in to view mission records.</td></tr></tbody></table></div></section><section class="section compact"><div class="section-title"><div><span class="eyebrow">Calibration history</span><h3>Recent trials</h3></div></div><div class="table-wrap"><table><thead><tr><th>Test</th><th>Target</th><th>Actual</th><th>Motor rotations</th><th>Starting reference</th><th>Observation</th></tr></thead><tbody data-calibration-records><tr><td colspan="6">Sign in to view calibration trials.</td></tr></tbody></table></div></section>`;
  recordTab.before(tab);
  recordPanelAnchor.before(panel);
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-tab],[data-panel]').forEach(element => element.classList.remove('active'));
    tab.classList.add('active'); panel.classList.add('active');
    history.replaceState(null, '', '#robot-records');
  });
  if (location.hash === '#robot-records') tab.click();
  setupRobotRecords(panel);
}

function recordEscape(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function formNumber(form, name) { const value = form.elements[name].value; return value === '' ? null : Number(value); }
function formText(form, name) { return form.elements[name].value.trim(); }

async function setupRobotRecords(panel) {
  const setupForm = panel.querySelector('#robot-setup-form');
  const calibrationForm = panel.querySelector('#robot-calibration-form');
  const missionForm = panel.querySelector('#robot-mission-form');
  const missionRows = panel.querySelector('[data-mission-records]');
  const calibrationRows = panel.querySelector('[data-calibration-records]');
  if (recordConfig.forceDemo || !recordConfig.supabaseUrl || !recordConfig.supabaseAnonKey) return;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(recordConfig.supabaseUrl, recordConfig.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  const { data: profile } = await db.from('profiles').select('team_id,role,approval_status').eq('id', session.user.id).maybeSingle();
  const canEdit = profile?.approval_status === 'approved' && ['coach', 'student_coach'].includes(profile.role);
  if (!profile?.team_id || profile.approval_status !== 'approved') return;
  const setEditable = form => form.querySelectorAll('input,select,textarea,button').forEach(field => { field.disabled = !canEdit; });
  [setupForm, calibrationForm, missionForm].forEach(form => {
    setEditable(form);
    if (!canEdit) {
      const message = form.querySelector('.form-message');
      if (message) message.textContent = 'Read-only for students and parents. Coaches maintain these team records.';
    }
  });
  const render = async () => {
    const [{ data: setup }, { data: calibrations }, { data: missions }] = await Promise.all([
      db.from('robot_setup').select('*').eq('team_id', profile.team_id).maybeSingle(),
      db.from('robot_calibration_runs').select('*').order('created_at', { ascending: false }).limit(25),
      db.from('robot_mission_runs').select('*').order('created_at', { ascending: false }).limit(50)
    ]);
    if (setup) Object.entries(setup).forEach(([key, value]) => { if (setupForm.elements[key]) setupForm.elements[key].value = value ?? ''; });
    calibrationRows.innerHTML = (calibrations || []).map(item => `<tr><td>${recordEscape(item.test_name)}<br><small>${recordEscape(item.test_kind)}</small></td><td>${item.target_value ?? '—'} ${recordEscape(item.unit)}</td><td>${item.actual_value ?? '—'} ${recordEscape(item.unit)}</td><td>${item.motor_rotations ?? '—'}</td><td>${recordEscape(item.start_reference || '—')}</td><td>${recordEscape(item.observation || '—')}</td></tr>`).join('') || '<tr><td colspan="6">No calibration trials recorded yet.</td></tr>';
    missionRows.innerHTML = (missions || []).map(item => `<tr><td>${recordEscape(item.mission)}<br><small>${recordEscape(item.program_name || '—')}</small></td><td>${recordEscape(item.attachment_name || '—')}</td><td>${item.observed_points ?? item.planned_points ?? '—'}</td><td>${item.successes}/${item.attempts} (${Math.round(item.successes / item.attempts * 100)}%)</td><td>${item.fastest_run_seconds == null ? '—' : `${item.fastest_run_seconds}s`}</td><td>${recordEscape(item.next_change || '—')}</td></tr>`).join('') || '<tr><td colspan="6">No mission records yet.</td></tr>';
  };
  setupForm.addEventListener('submit', async event => {
    event.preventDefault(); const message = setupForm.querySelector('[data-setup-message]'); message.textContent = 'Saving…';
    const values = ['table_length_mm','table_width_mm','robot_length_mm','robot_width_mm','robot_height_mm','wheel_diameter_mm','distance_per_motor_rotation_mm','turn_90_motor_rotations'];
    const payload = Object.fromEntries(values.map(name => [name, formNumber(setupForm, name)]));
    ['drive_motor_ports','gear_ratio','launch_alignment_notes','gyro_and_sensor_notes'].forEach(name => { payload[name] = formText(setupForm, name); });
    const { error } = await db.from('robot_setup').upsert({ ...payload, team_id: profile.team_id, updated_by: session.user.id, updated_at: new Date().toISOString() });
    message.textContent = error ? 'Setup could not be saved.' : 'Shared robot setup saved.';
  });
  calibrationForm.addEventListener('submit', async event => {
    event.preventDefault(); const message = calibrationForm.querySelector('[data-calibration-message]'); message.textContent = 'Saving…';
    const { error } = await db.from('robot_calibration_runs').insert({ team_id: profile.team_id, author_id: session.user.id, test_kind: formText(calibrationForm, 'test_kind'), test_name: formText(calibrationForm, 'test_name'), target_value: formNumber(calibrationForm, 'target_value'), actual_value: formNumber(calibrationForm, 'actual_value'), unit: formText(calibrationForm, 'unit'), motor_rotations: formNumber(calibrationForm, 'motor_rotations'), start_reference: formText(calibrationForm, 'start_reference'), observation: formText(calibrationForm, 'observation') });
    if (error) { message.textContent = 'Calibration trial could not be saved.'; return; }
    calibrationForm.reset(); message.textContent = 'Calibration trial saved.'; await render();
  });
  missionForm.addEventListener('submit', async event => {
    event.preventDefault(); const message = missionForm.querySelector('[data-mission-message]'); const attempts = formNumber(missionForm, 'attempts'); const successes = formNumber(missionForm, 'successes');
    if (successes > attempts) { message.textContent = 'Successes cannot be higher than attempts.'; return; }
    message.textContent = 'Saving…';
    const fields = ['mission','attachment_name','program_name','launch_reference','result_notes','next_change'];
    const numeric = ['planned_points','observed_points','fastest_run_seconds','average_run_seconds'];
    const payload = Object.fromEntries(fields.map(name => [name, formText(missionForm, name)]));
    numeric.forEach(name => { payload[name] = formNumber(missionForm, name); }); payload.attempts = attempts; payload.successes = successes;
    const { error } = await db.from('robot_mission_runs').insert({ ...payload, team_id: profile.team_id, author_id: session.user.id });
    if (error) { message.textContent = 'Mission record could not be saved.'; return; }
    missionForm.reset(); missionForm.elements.attempts.value = 5; missionForm.elements.successes.value = 0; message.textContent = 'Mission record saved.'; await render();
  });
  await render();
}
