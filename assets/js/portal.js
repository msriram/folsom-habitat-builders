const progressAreas = ["Robot", "Project", "Teamwork", "Presentation"];
const codingLessons = [
  {
    title: "Variables",
    name: "Habitat Score",
    concept: "Store and change a value",
    challenge: "Change habitatScore and predict whether the total rises or falls.",
    code: `let habitatScore = 40;
let treesPlanted = 6;

habitatScore = habitatScore + treesPlanted * 5;

print("Habitat score:", habitatScore);`
  },
  {
    title: "If / else",
    name: "Moisture Check",
    concept: "Make a decision",
    challenge: "Try moisture values of 20, 45, and 80. What message appears each time?",
    code: `let moisture = 45;

if (moisture < 30) {
  print("Soil is too dry");
} else if (moisture > 70) {
  print("Soil is very wet");
} else {
  print("Moisture is in range");
}`
  },
  {
    title: "For loop",
    name: "Seed Counter",
    concept: "Repeat an action",
    challenge: "Change the loop so it counts 8 seeds, then make it count by twos.",
    code: `let collected = 0;

for (let seed = 1; seed <= 5; seed++) {
  collected = collected + 1;
  print("Collected seed", seed);
}

print("Total:", collected);`
  },
  {
    title: "Functions",
    name: "Robot Distance",
    concept: "Reuse a calculation",
    challenge: "Add a third move and calculate the new total distance.",
    code: `function wheelDistance(rotations, centimetersPerTurn) {
  return rotations * centimetersPerTurn;
}

let firstMove = wheelDistance(3, 17.6);
let secondMove = wheelDistance(1.5, 17.6);

print("First move:", firstMove, "cm");
print("Total:", firstMove + secondMove, "cm");`
  },
  {
    title: "Arrays",
    name: "Mission Scores",
    concept: "Keep a list of values",
    challenge: "Add another mission score and verify the new match total.",
    code: `let missionScores = [30, 20, 20, 30];
let total = 0;

for (let score of missionScores) {
  total = total + score;
}

print("Missions scored:", missionScores.length);
print("Match total:", total);`
  },
  {
    title: "Objects",
    name: "Species Record",
    concept: "Group related information",
    challenge: "Change the species and add a property named habitat.",
    code: `let observation = {
  species: "Monarch butterfly",
  count: 7,
  native: true
};

print("Species:", observation.species);
print("Count:", observation.count);
print("Native:", observation.native);`
  },
  {
    title: "Filtering",
    name: "At-Risk Species",
    concept: "Select matching data",
    challenge: "Change one risk level and see which names remain in the result.",
    code: `let species = [
  { name: "Frog", risk: "high" },
  { name: "Toucan", risk: "medium" },
  { name: "Orchid", risk: "high" }
];

let atRisk = species.filter(item => item.risk === "high");

for (let item of atRisk) {
  print(item.name, "needs attention");
}`
  },
  {
    title: "While loop",
    name: "Battery Check",
    concept: "Repeat until a condition changes",
    challenge: "Start at 100 percent and change the amount used during each run.",
    code: `let battery = 60;
let run = 1;

while (battery >= 20) {
  print("Run", run, "battery:", battery + "%");
  battery = battery - 15;
  run = run + 1;
}

print("Recharge before the next run");`
  },
  {
    title: "Testing",
    name: "Reliability Test",
    concept: "Measure repeated results",
    challenge: "Change false results to true and see when reliability reaches 80 percent.",
    code: `let trials = [true, true, false, true, true,
              false, true, true, true, false];
let successes = 0;

for (let passed of trials) {
  if (passed) successes++;
}

let reliability = successes / trials.length * 100;
print("Successes:", successes, "of", trials.length);
print("Reliability:", reliability + "%");`
  },
  {
    title: "Robot route",
    name: "Route Simulator",
    concept: "Combine steps and functions",
    challenge: "Add a mission action and shorten the route without changing its final heading.",
    code: `let heading = 0;
let distance = 0;

function drive(cm) {
  distance = distance + cm;
  print("Drive", cm, "cm");
}

function turn(degrees) {
  heading = (heading + degrees + 360) % 360;
  print("Turn to", heading, "degrees");
}

drive(45);
turn(90);
drive(30);
print("Mission action: lower vine");
turn(-90);
drive(50);

print("Route distance:", distance, "cm");
print("Final heading:", heading, "degrees");`
  }
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function activateTab(name) {
  const button = $(`[data-tab="${name}"]`);
  const panel = $(`[data-panel="${name}"]`);
  if (!button || !panel) return;
  $$('[data-tab],[data-panel]').forEach(element => element.classList.remove("active"));
  button.classList.add("active");
  panel.classList.add("active");
}

$$('[data-tab]').forEach(button => button.addEventListener("click", () => {
  activateTab(button.dataset.tab);
  history.replaceState(null, "", `#${button.dataset.tab}`);
}));
$$('[data-tab-jump]').forEach(button => button.addEventListener("click", () => {
  activateTab(button.dataset.tabJump);
  history.replaceState(null, "", `#${button.dataset.tabJump}`);
}));
const requestedTab = new URLSearchParams(location.search).get("tab");
activateTab(requestedTab || location.hash.slice(1) || "dashboard");
window.addEventListener("hashchange", () => activateTab(location.hash.slice(1) || requestedTab || "dashboard"));

let liveContextPromise;
async function getLiveContext() {
  if (liveContextPromise) return liveContextPromise;
  liveContextPromise = (async () => {
    const config = window.FIREFLIES_PORTAL_CONFIG || {};
    if (config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) return { config, db: null, session: null, profile: null };
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const db = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data: { session } } = await db.auth.getSession();
    if (!session) return { config, db, session: null, profile: null };
    const { data: profile } = await db.from("profiles").select("id,team_id,display_name,role,approval_status,linked_student_id").eq("id", session.user.id).maybeSingle();
    return { config, db, session, profile };
  })();
  return liveContextPromise;
}

async function setupRoleAccess() {
  const parentTab = $('[data-tab="parent"]');
  const coachTab = $('[data-tab="coach"]');
  parentTab.hidden = true;
  coachTab.hidden = true;
  const { session, profile } = await getLiveContext();
  if (!session) return;
  const signInBanner = document.querySelector(".live-alert");
  if (signInBanner) signInBanner.hidden = true;
  if (profile?.approval_status !== "approved") {
    $("#workspace-status").textContent = "Waiting for coach approval";
    $("#coding-save-status").textContent = "Waiting for coach approval";
    return;
  }
  $("#welcome").textContent = `${profile.display_name || "Team member"}'s dashboard`;
  $("#workspace-status").textContent = profile.role;
  $("#coding-save-status").textContent = profile.role === "student" ? "Ready to save to the team" : "Team projects available";
  if (profile.role === "parent") parentTab.hidden = false;
  if (["coach", "student_coach"].includes(profile.role)) coachTab.hidden = false;
}

function renderProgress(values) {
  $("#progress-cards").innerHTML = progressAreas.map(name => `<article class="card"><strong>${name}</strong><div class="progress-track"><div class="progress-bar" style="width:${values[name] || 0}%"></div></div><span>${values[name] || 0}%</span></article>`).join("");
  $("#parent-progress").innerHTML = progressAreas.map(name => `<div class="progress-row"><strong>${name}</strong><div class="progress-track"><div class="progress-bar" style="width:${values[name] || 0}%"></div></div><span>${values[name] || 0}%</span></div>`).join("");
}

async function setupProgress() {
  renderProgress({});
  const { db, session, profile } = await getLiveContext();
  if (!db || !session || profile?.approval_status !== "approved") return;
  const { data: items } = await db.from("schedule_items").select("area,week_number,completed");
  if (!items) return;
  const week = $("#progress-week");
  const calculate = () => {
    const through = week.value === "all" ? Infinity : Number(week.value);
    const values = {};
    for (const area of progressAreas) {
      const relevant = items.filter(item => item.area === area && item.week_number <= through);
      values[area] = relevant.length ? Math.round(relevant.filter(item => item.completed).length / relevant.length * 100) : 0;
    }
    renderProgress(values);
  };
  week.addEventListener("change", calculate);
  calculate();
}

function syntaxHighlight(source) {
  const keywords = new Set(["let", "const", "var", "if", "else", "for", "of", "while", "function", "return", "true", "false", "null"]);
  const builtins = new Set(["print", "length", "filter"]);
  let html = "";
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === "/" && source[index + 1] === "/") {
      let end = source.indexOf("\n", index);
      if (end < 0) end = source.length;
      html += `<span class="tok-comment">${escapeHtml(source.slice(index, end))}</span>`;
      index = end;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === "\\") end += 2;
        else if (source[end++] === char) break;
      }
      html += `<span class="tok-string">${escapeHtml(source.slice(index, end))}</span>`;
      index = end;
      continue;
    }
    if (/\d/.test(char)) {
      const match = source.slice(index).match(/^\d+(?:\.\d+)?/)[0];
      html += `<span class="tok-number">${match}</span>`;
      index += match.length;
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const word = source.slice(index).match(/^[A-Za-z_$][\w$]*/)[0];
      const className = keywords.has(word) ? "tok-keyword" : builtins.has(word) ? "tok-builtin" : "";
      html += className ? `<span class="${className}">${word}</span>` : word;
      index += word.length;
      continue;
    }
    html += escapeHtml(char);
    index++;
  }
  return html + "\n";
}

const editor = $("#code-input");
const highlight = $("#code-highlight");
const lineNumbers = $("#code-lines");
let activeLesson = 0;

function syncEditor() {
  highlight.innerHTML = syntaxHighlight(editor.value);
  lineNumbers.textContent = Array.from({ length: editor.value.split("\n").length }, (_, index) => index + 1).join("\n");
}

function selectLesson(index) {
  activeLesson = index;
  const lesson = codingLessons[index];
  editor.value = lesson.code;
  $("#project-name").value = lesson.name;
  $("#lesson-challenge").textContent = lesson.challenge;
  $$('[data-lesson-index]').forEach(button => button.classList.toggle("active", Number(button.dataset.lessonIndex) === index));
  syncEditor();
  $("#program-output").textContent = `Ready: ${lesson.name}\nPress Run code.`;
}

$("#lesson-picker").innerHTML = codingLessons.map((lesson, index) => `<button type="button" data-lesson-index="${index}" role="listitem"><span>${index + 1}</span><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.concept)}</small></button>`).join("");
$$('[data-lesson-index]').forEach(button => button.addEventListener("click", () => selectLesson(Number(button.dataset.lessonIndex))));
editor.addEventListener("input", syncEditor);
editor.addEventListener("scroll", () => {
  highlight.parentElement.scrollTop = editor.scrollTop;
  highlight.parentElement.scrollLeft = editor.scrollLeft;
  lineNumbers.scrollTop = editor.scrollTop;
});
editor.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const start = editor.selectionStart;
  editor.setRangeText("  ", start, editor.selectionEnd, "end");
  syncEditor();
});
selectLesson(0);

function runCode() {
  const output = $("#program-output");
  output.textContent = "Running…";
  const workerSource = `
    self.fetch = () => Promise.reject(new Error("Network access is disabled in lessons"));
    const format = value => typeof value === "object" ? JSON.stringify(value) : String(value);
    const print = (...values) => postMessage({ type: "line", value: values.map(format).join(" ") });
    console.log = print;
    console.error = (...values) => postMessage({ type: "error", value: values.map(format).join(" ") });
    onmessage = event => {
      try { new Function("print", event.data)(print); postMessage({ type: "done" }); }
      catch (error) { postMessage({ type: "error", value: error.name + ": " + error.message }); }
    };`;
  const worker = new Worker(URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" })));
  const lines = [];
  const timeout = setTimeout(() => {
    worker.terminate();
    output.textContent = `${lines.join("\n")}\nStopped: the program ran for too long.`.trim();
  }, 1200);
  worker.onmessage = event => {
    if (event.data.type === "line") lines.push(event.data.value);
    if (event.data.type === "error") lines.push(`Error: ${event.data.value}`);
    output.textContent = lines.join("\n") || "Program finished with no printed output.";
    if (event.data.type === "done" || event.data.type === "error") {
      clearTimeout(timeout);
      worker.terminate();
    }
  };
  worker.postMessage(editor.value);
}

$("#run-code").addEventListener("click", runCode);
$("#clear-output").addEventListener("click", () => { $("#program-output").textContent = "Output cleared."; });

async function loadCodingProjects() {
  const gallery = $("#team-coding-projects");
  const versionList = $("#version-list");
  const { db, session, profile } = await getLiveContext();
  if (!db || !session) return;
  if (profile?.approval_status !== "approved") {
    gallery.innerHTML = '<p class="muted">Account approval is required to view team projects.</p>';
    versionList.innerHTML = '<li>Account approval is required to load saved work.</li>';
    return;
  }
  const { data: projects, error } = await db.from("coding_projects").select("id,title,owner_id,created_at,coding_versions(version_number,javascript,reflection,created_at)").order("created_at", { ascending: false }).limit(50);
  if (error) {
    window.FIREFLIES_DIAGNOSTICS?.report("Coding projects", error);
    gallery.innerHTML = '<p class="muted">Projects are unavailable right now.</p>';
    return;
  }
  const ownerIds = [...new Set((projects || []).map(project => project.owner_id))];
  const { data: people } = ownerIds.length ? await db.from("profiles").select("id,display_name").in("id", ownerIds) : { data: [] };
  const names = Object.fromEntries((people || []).map(person => [person.id, person.display_name]));
  const normalized = (projects || []).map(project => ({
    ...project,
    latest: [...(project.coding_versions || [])].sort((a, b) => b.version_number - a.version_number)[0]
  })).filter(project => project.latest);
  gallery.innerHTML = normalized.length ? normalized.map(project => `<article class="project-card"><div><span class="status-chip">Completed · v${project.latest.version_number}</span><h4>${escapeHtml(project.title)}</h4><small>${escapeHtml(names[project.owner_id] || "Team member")} · ${new Date(project.latest.created_at).toLocaleDateString()}</small></div><pre>${escapeHtml(project.latest.javascript.split("\n").slice(0, 5).join("\n"))}</pre><button class="mini-action" type="button" data-open-project="${project.id}">Open in editor</button></article>`).join("") : '<p class="muted">No coding projects have been saved yet.</p>';
  versionList.innerHTML = normalized.filter(project => project.owner_id === session.user.id).map(project => `<li><strong>${escapeHtml(project.title)}</strong> · version ${project.latest.version_number}<br><span>${escapeHtml(project.latest.reflection || "No reflection added")}</span></li>`).join("") || "<li>You have not saved a project yet.</li>";
  $$('[data-open-project]').forEach(button => button.addEventListener("click", () => {
    const project = normalized.find(item => item.id === button.dataset.openProject);
    if (!project) return;
    $("#project-name").value = project.title;
    editor.value = project.latest.javascript;
    $("#build-reflection").value = project.latest.reflection || "";
    syncEditor();
    activateTab("build");
    history.replaceState(null, "", "#build");
  }));
}

async function saveCodingProject() {
  const message = $("#coding-message");
  const button = $("#save-project");
  const title = $("#project-name").value.trim();
  const reflection = $("#build-reflection").value.trim();
  if (!title || !editor.value.trim()) {
    message.textContent = "Add a project name and code first.";
    return;
  }
  const { db, session, profile } = await getLiveContext();
  if (!db || !session) {
    message.textContent = "Sign in with Google to save this project.";
    return;
  }
  if (profile?.approval_status !== "approved" || profile.role !== "student") {
    message.textContent = "Saving completed projects is available to approved student accounts.";
    return;
  }
  button.disabled = true;
  message.textContent = "Saving…";
  let { data: project } = await db.from("coding_projects").select("id").eq("owner_id", session.user.id).eq("title", title).limit(1).maybeSingle();
  if (!project) {
    const created = await db.from("coding_projects").insert({ team_id: profile.team_id, owner_id: session.user.id, title, visibility: "team" }).select("id").single();
    if (created.error) {
      button.disabled = false;
      window.FIREFLIES_DIAGNOSTICS?.report("Create coding project", created.error);
      message.textContent = "This project could not be saved right now.";
      return;
    }
    project = created.data;
  }
  const { data: previous } = await db.from("coding_versions").select("version_number").eq("project_id", project.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
  const versionNumber = (previous?.version_number || 0) + 1;
  const { error } = await db.from("coding_versions").insert({ project_id: project.id, version_number: versionNumber, html: "", css: "", javascript: editor.value, reflection });
  button.disabled = false;
  if (error) {
    window.FIREFLIES_DIAGNOSTICS?.report("Save coding project", error);
    message.textContent = "This project could not be saved right now.";
    return;
  }
  message.textContent = `Saved ${title} version ${versionNumber} for the team.`;
  $("#coding-save-status").textContent = "Saved to team database";
  await loadCodingProjects();
}

$("#save-project").addEventListener("click", saveCodingProject);

async function setupRobotTests() {
  const form = $("#robot-form");
  const body = $("#robot-tests");
  const { db, session, profile } = await getLiveContext();
  if (!db || !session) {
    body.innerHTML = '<tr><td colspan="5">Sign in with an approved account to view the team test log.</td></tr>';
    form.querySelector("button").disabled = true;
    return;
  }
  if (profile?.approval_status !== "approved") {
    body.innerHTML = '<tr><td colspan="5">Account approval is required to view the team test log.</td></tr>';
    form.querySelector("button").disabled = true;
    return;
  }
  const render = async () => {
    const { data: tests } = await db.from("robot_tests").select("mission,attempts,successes,next_change,created_at").order("created_at", { ascending: false }).limit(50);
    body.innerHTML = (tests || []).map(test => `<tr><td>${escapeHtml(test.mission)}</td><td>${test.attempts}</td><td>${test.successes}</td><td><strong>${Math.round(test.successes / test.attempts * 100)}%</strong></td><td>${escapeHtml(test.next_change || "—")}</td></tr>`).join("") || '<tr><td colspan="5">No robot tests recorded yet.</td></tr>';
  };
  if (!["student", "coach"].includes(profile.role)) form.querySelector("button").disabled = true;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const attempts = Number($("#attempts").value);
    const successes = Number($("#successes").value);
    if (successes > attempts) return;
    const { error } = await db.from("robot_tests").insert({ team_id: profile.team_id, author_id: session.user.id, mission: $("#mission").value.trim(), attempts, successes, next_change: $("#next-change").value.trim() });
    if (error) {
      window.FIREFLIES_DIAGNOSTICS?.report("Robot test", error);
      alert("This test could not be saved right now.");
      return;
    }
    form.reset();
    $("#attempts").value = 10;
    $("#successes").value = 8;
    await render();
  });
  await render();
}

async function setupGuide() {
  const form = $("#question-form");
  const status = $("#guide-status");
  const message = $("#guide-message");
  const button = form.querySelector("button");
  const { config, db, session, profile } = await getLiveContext();
  if (!db || !session) {
    status.textContent = "Sign in required";
    button.disabled = true;
    message.textContent = "Use the account button above to sign in with Google.";
    return;
  }
  const allowed = profile?.approval_status === "approved" && ["student", "coach"].includes(profile?.role);
  const blockedRequest = /\b(generate|create|design|draw|render|image|photo|picture|video|diagram|logo|illustration|graphic|visual|audio|animate|animation)\b/i;
  status.textContent = allowed ? "Live research tool" : "Approval required";
  button.disabled = !allowed;
  if (!allowed) return;
  const updateQuestionGuard = () => {
    const blocked = blockedRequest.test($("#question-text").value);
    button.disabled = blocked;
    if (blocked) message.textContent = "Ask AI supports text research questions only—not image, video, design, or generation requests.";
    else if (message.textContent.startsWith("Ask AI supports text research")) message.textContent = "";
  };
  $("#question-text").addEventListener("input", updateQuestionGuard);
  const render = async () => {
    const { data: history } = await db.from("questions").select("question,ai_answer,created_at,author_id").not("ai_answer", "is", null).order("created_at", { ascending: false }).limit(20);
    const authorNames = new Map();
    if (["coach", "student_coach"].includes(profile?.role) && history?.length) {
      const ids = [...new Set(history.map(item => item.author_id).filter(Boolean))];
      const { data: authors } = await db.from("profiles").select("id,display_name").in("id", ids);
      (authors || []).forEach(author => authorNames.set(author.id, author.display_name));
    }
    $("#question-list").innerHTML = (history || []).map(item => {
      const author = authorNames.get(item.author_id);
      const label = ["coach", "student_coach"].includes(profile?.role) ? `Asked by ${escapeHtml(author || "Unknown team member")}` : "Team only";
      return `<article class="card"><span class="status-chip">${label}</span><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.ai_answer)}</p></article>`;
    }).join("") || '<p class="muted">No saved questions yet.</p>';
  };
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const question = $("#question-text").value.trim();
    if (!question) return;
    if (blockedRequest.test(question)) {
      message.textContent = "Ask AI supports text research questions only—not image, video, design, or generation requests.";
      return;
    }
    button.disabled = true;
    button.textContent = "Researching…";
    message.textContent = "";
    const { data, error } = await db.functions.invoke(config.functions?.guide || "firefly-guide", { body: { question } });
    button.disabled = blockedRequest.test($("#question-text").value);
    button.textContent = "Ask AI";
    if (error || data?.error) {
      const detail = data?.error || error?.message || "Ask AI is unavailable right now.";
      window.FIREFLIES_DIAGNOSTICS?.report("Ask AI", detail);
      message.textContent = detail;
      return;
    }
    form.reset();
    message.textContent = `Saved for coach review · ${data.remaining} AI questions remaining today.`;
    await render();
  });
  await render();
}

Promise.allSettled([
  setupRoleAccess(),
  setupProgress(),
  loadCodingProjects(),
  setupRobotTests(),
  setupGuide()
]);
