(() => {
  const diagnosticsKey = "folsom-fll-diagnostics";
  const redactDiagnostic = value => String(value || "Unknown error")
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[redacted key]")
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[redacted token]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted connection string]")
    .slice(0, 800);
  const readDiagnostics = () => {
    try { return JSON.parse(sessionStorage.getItem(diagnosticsKey) || "[]"); }
    catch { return []; }
  };
  window.FIREFLIES_DIAGNOSTICS = {
    report(area, error) {
      const entries = readDiagnostics();
      entries.unshift({ time: new Date().toISOString(), area, detail: redactDiagnostic(error?.message || error) });
      sessionStorage.setItem(diagnosticsKey, JSON.stringify(entries.slice(0, 20)));
    },
    list: readDiagnostics,
    clear() { sessionStorage.removeItem(diagnosticsKey); }
  };
  const markdownEscape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const markdownInline = value => markdownEscape(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>');
  const markdownRender = value => {
    const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    let list = '';
    const closeList = () => { if (list) { html.push(`</${list}>`); list = ''; } };
    for (const line of lines) {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      const bullet = line.match(/^[-*+]\s+(.+)$/);
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (heading) { closeList(); html.push(`<h${heading[1].length}>${markdownInline(heading[2])}</h${heading[1].length}>`); }
      else if (bullet || numbered) {
        const type = numbered ? 'ol' : 'ul';
        if (list !== type) { closeList(); list = type; html.push(`<${type}>`); }
        html.push(`<li>${markdownInline((bullet || numbered)[1])}</li>`);
      } else if (/^>\s?/.test(line)) { closeList(); html.push(`<blockquote>${markdownInline(line.replace(/^>\s?/, ''))}</blockquote>`); }
      else if (/^---+$/.test(line.trim())) { closeList(); html.push('<hr>'); }
      else if (!line.trim()) { closeList(); }
      else { closeList(); html.push(`<p>${markdownInline(line)}</p>`); }
    }
    closeList();
    return html.join('') || '<p></p>';
  };
  window.FIREFLIES_MARKDOWN = { render: markdownRender };
  window.addEventListener("error", event => window.FIREFLIES_DIAGNOSTICS.report("Browser", event.error || event.message));
  window.addEventListener("unhandledrejection", event => window.FIREFLIES_DIAGNOSTICS.report("Browser", event.reason));

  // A title on the root HTML element becomes a browser tooltip across the
  // entire page. Keep labels on the individual color choices only.
  document.documentElement.removeAttribute("title");
  const savedTheme = localStorage.getItem("fireflies-theme");
  const initialTheme = savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = initialTheme;
  const colorThemeKey = "fireflies-color-theme";
  const colorThemes = ["forest", "ocean", "violet", "sunset", "rose", "cobalt", "citrus", "slate", "berry", "mint", "lagoon", "ember"];
  const colorThemeOptions = [
    ["forest", "Habitat Green"], ["ocean", "Blue Current"], ["violet", "Electric Violet"], ["sunset", "Sunset Glow"], ["rose", "Rose Quartz"],
    ["cobalt", "Cobalt Circuit"], ["citrus", "Crunchy Citrus"], ["slate", "Cool Slate"], ["berry", "Berry Burst"], ["mint", "Fresh Mint"], ["lagoon", "Lagoon Glow"], ["ember", "Ember Trail"]
  ];
  const applyColorTheme = theme => {
    document.documentElement.dataset.colorTheme = colorThemes.includes(theme) ? theme : "forest";
  };
  applyColorTheme(localStorage.getItem(colorThemeKey) || "forest");

  const navItems = [
    ["Home", "index.html"],
    ["Homework", "portal.html#homework"],
    ["Team", "roster.html"],
    ["Sessions", "season.html"],
    ["Resources", "resources.html"]
  ];

  const page = document.body.dataset.page || "Home";
  const header = document.querySelector("[data-site-header]");
  if (header) {
    header.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <div class="site-header">
        <div class="nav-wrap">
          <a class="brand" href="index.html">
            <img src="assets/img/habitat-builders-logo.png" alt="" width="52" height="52">
            <span>Habitat Builders<small class="brand-subtitle"><span class="brand-subtitle-short">A Folsom FLL Team</span><span class="brand-subtitle-long">A Folsom Theodore Judah Elementary 4th Grade FLL Team</span></small></span>
          </a>
          <nav class="site-nav" id="site-nav" aria-label="Main navigation">
            ${navItems.map(([label, href]) => `<a href="${href}" ${page === label ? 'aria-current="page"' : ''}>${label}</a>`).join("")}
            <div class="nav-dropdown">
              <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-controls="focus-menu" ${["Robot","Project","Core Values","Tournament"].includes(page)?'aria-current="page"':''}>Focus Areas <span aria-hidden="true">▾</span></button>
              <div class="nav-dropdown-menu" id="focus-menu">
                <a href="robot.html" ${page==="Robot"?'aria-current="page"':''}>Robot Challenge</a>
                <a href="project.html" ${page==="Project"?'aria-current="page"':''}>Innovation Project</a>
                <a href="core-values.html" ${page==="Core Values"?'aria-current="page"':''}>Core Values</a>
                <a href="tournament.html" ${page==="Tournament"?'aria-current="page"':''}>Tournament Format</a>
              </div>
            </div>
            <a href="portal.html" ${page === "Team Room" ? 'aria-current="page"' : ''}>Team Room</a>
          </nav>
          <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
          <div class="header-actions">
            <button class="round-control theme-toggle" type="button" aria-label="Switch to night mode">
              <svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
              <svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg>
            </button>
            <div class="theme-menu-wrap">
              <button class="round-control theme-palette-toggle" type="button" aria-label="Choose color theme" aria-expanded="false" aria-controls="theme-palette-menu">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/></svg>
              </button>
              <div class="theme-palette-menu" id="theme-palette-menu" hidden>
                <div class="theme-swatches" role="group" aria-label="Choose color theme">${colorThemeOptions.map(([value,name])=>`<button type="button" class="theme-swatch ${value}" data-color-theme="${value}" aria-label="${name}" title="${name}"></button>`).join("")}</div>
              </div>
            </div>
            <div class="account-menu-wrap">
              <button class="round-control account-button" type="button" aria-label="Open account menu" aria-expanded="false" aria-controls="account-menu">
                <svg class="signed-out-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.8 20c.7-4 3.1-6 7.2-6s6.5 2 7.2 6"/></svg>
                <img class="signed-in-mascot" src="assets/img/habitat-builders-logo.png" alt="" hidden>
              </button>
              <div class="account-dropdown" id="account-menu" hidden>
                <div class="account-summary">
                  <strong data-account-name>Team account</strong>
                  <span data-account-email>Not signed in</span>
                  <small data-account-status>Google account required</small>
                </div>
                <button class="account-action" type="button" data-google-signin>Continue with Google</button>
                <a class="account-action" href="profile.html" data-profile-link hidden>My profile</a>
                <a class="account-action" href="admin.html" data-admin-link hidden>Admin approvals</a>
                <a class="account-action" href="admin-settings.html" data-settings-link hidden>⚙ Admin settings</a>
                <button class="account-action" type="button" data-signout hidden>Sign out</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const menu = header.querySelector(".menu-button");
    const nav = header.querySelector(".site-nav");
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });
    const focusToggle=header.querySelector(".nav-dropdown-toggle");
    const focusDropdown=header.querySelector(".nav-dropdown");
    focusToggle.addEventListener("click",event=>{
      event.stopPropagation();
      const open=focusDropdown.classList.toggle("open");
      focusToggle.setAttribute("aria-expanded",String(open));
    });
    document.addEventListener("click",event=>{
      if(!focusDropdown.contains(event.target)){focusDropdown.classList.remove("open");focusToggle.setAttribute("aria-expanded","false");}
    });

    const themeButton = header.querySelector(".theme-toggle");
    const setThemeButton = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      const label = dark ? "Switch to day mode" : "Switch to night mode";
      themeButton.setAttribute("aria-label", label);
      themeButton.removeAttribute("title");
    };
    setThemeButton();
    themeButton.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("fireflies-theme", next);
      setThemeButton();
    });
    const paletteWrap = header.querySelector(".theme-menu-wrap");
    const paletteToggle = header.querySelector(".theme-palette-toggle");
    const paletteMenu = header.querySelector(".theme-palette-menu");
    const closePalette = () => { paletteMenu.hidden = true; paletteToggle.setAttribute("aria-expanded", "false"); };
    paletteToggle.addEventListener("click", event => {
      event.stopPropagation();
      const open = paletteMenu.hidden;
      paletteMenu.hidden = !open;
      paletteToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", event => { if (!paletteWrap.contains(event.target)) closePalette(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closePalette(); });
    const accountButton = header.querySelector(".account-button");
    const accountDropdown = header.querySelector(".account-dropdown");
    const closeAccount = () => {
      accountDropdown.hidden = true;
      accountButton.setAttribute("aria-expanded", "false");
    };
    accountButton.addEventListener("click", event => {
      event.stopPropagation();
      const open = accountDropdown.hidden;
      accountDropdown.hidden = !open;
      accountButton.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", event => {
      if (!header.querySelector(".account-menu-wrap").contains(event.target)) closeAccount();
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeAccount(); });
    initializeAccountMenu(header);
  }

  const footer = document.querySelector("[data-site-footer]");
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <a class="brand" href="index.html"><img src="assets/img/habitat-builders-logo.png" alt="" width="52" height="52"><span>Habitat Builders<small>A Folsom FLL Team</small></span></a>
              <p>The team workspace for our 2026–27 robot work, biodiversity project, sessions, assignments, and family coordination.</p>
            </div>
            <div><strong>Focus areas</strong><p><a href="robot.html">Robot Challenge</a><br><a href="project.html">Innovation Project</a><br><a href="core-values.html">Core Values</a><br><a href="tournament.html">Tournament Format</a><br><a href="resources.html">Official Resources</a></p></div>
            <div><strong>Privacy</strong><p><small>We avoid publishing children's full names, contact information, school schedules, or identifiable photos without parent permission.</small></p></div>
          </div>
          <div class="footer-bottom"><small>© <span data-year></span> Habitat Builders</small><small>Independent Folsom community team site. FIRST® and LEGO® are trademarks of their respective owners.</small></div>
        </div>
      </footer>`;
    footer.querySelector("[data-year]").textContent = new Date().getFullYear();
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add("visible");
  }, { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

  const progressRoot = document.querySelector("[data-progress]");
  if (progressRoot && window.FIREFLIES_DATA) {
    progressRoot.innerHTML = FIREFLIES_DATA.progress.map(item => `
      <div class="progress-row">
        <strong>${item.label}</strong>
        <div class="progress-track" role="progressbar" aria-label="${item.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.value}">
          <div class="progress-bar" style="width:${item.value}%"></div>
        </div>
        <span>${item.value}%</span>
      </div>`).join("");
  }

  const journalRoot = document.querySelector("[data-journal]");
  if (journalRoot && window.FIREFLIES_DATA) {
    journalRoot.innerHTML = FIREFLIES_DATA.journal.map(entry => `
      <article class="journal-entry">
        <time>${entry.date}</time>
        <div><h3>${entry.title}</h3><p>${entry.text}</p></div>
      </article>`).join("");
  }

  // Keep every meeting page tied to the corresponding Engineering Notebook
  // session, even when the page was authored before the season calendar moved.
  const sessionNumber = Number(document.body.dataset.session?.replace('meeting-', ''));
  const notebookSessions = {
    1: ['Friday, August 14', 'Field and robot baseline', 'Build and test the first mechanisms; use basic SPIKE movement programming and record what to carry into Session 2.'],
    2: ['Friday, August 21', 'Build, measure, and map the field', 'Continue the builds, measure the board, and map one useful distance to repeatable motor movement if possible.'],
    3: ['Friday, August 28', 'First reliable missions', 'Use the notebook mission pages to choose a small, repeatable test and record every result.'],
    4: ['Friday, September 4', 'Project Sparks and Challenge Story', 'Read the Sparks and Challenge Story pages, then connect one spark to a biodiversity problem.'],
    5: ['Friday, September 11', 'Research and existing solutions', 'Continue research, use the Innovation Project planning page, and decide whether to improve an existing solution or create something new.'],
    6: ['Friday, September 18', 'Solution plan and pseudocode', 'Plan the solution, use varied sources, write pseudocode, and test one robot mission program.'],
    7: ['Friday, September 25', 'Prototype and test', 'Draw or build a prototype, document it, and test the robot and attachments.'],
    8: ['Friday, October 2', 'Feedback and iteration', 'Share the project, collect feedback, revise the solution, and update a robot program or attachment.'],
    9: ['Friday, October 9', 'Impact and mission strategy', 'Explain the project impact, choose a mission strategy, and record the next improvement.'],
    10: ['Friday, October 16', 'Presentation draft', 'Outline and rehearse the project presentation with clear evidence and a Coopertition example.'],
    11: ['Friday, October 23', 'Robot design explanation', 'Prepare the robot design explanation, attachment/code evidence, and a short team celebration.'],
    12: ['Friday, October 30', 'Full event rehearsal', 'Review goals, practice judging and robot explanations, collect feedback, and prepare for event day.']
  };
  const sessionPlan = notebookSessions[sessionNumber];
  const main = document.querySelector('main#main');
  if (sessionPlan && main && !main.querySelector('[data-notebook-alignment]')) {
    const head = main.querySelector('.meeting-head span');
    const title = main.querySelector('.meeting-head h1');
    if (head) head.textContent = `Session ${sessionNumber} · ${sessionPlan[0]} · 90 minutes`;
    if (title) title.textContent = sessionPlan[1];
    const section = document.createElement('section');
    section.className = 'section compact tint';
    section.dataset.notebookAlignment = '';
    section.innerHTML = `<div class="container"><div class="plain-panel"><span class="eyebrow">Engineering Notebook alignment</span><h2>Session ${sessionNumber} · ${sessionPlan[1]}</h2><p>${sessionPlan[2]}</p><p class="muted">Bring: laptop or tablet · pen or pencil · notebook</p><a href="downloads/bioglow/engineering-notebook.pdf" target="_blank" rel="noopener">Open the Engineering Notebook ↗</a></div></div>`;
    main.append(section);
  }
})();
if (document.body.dataset.session) import('./session-materials.js?v=queued-flow1');
if (document.body.dataset.session) import('./model-build-session-overrides.js?v=m8-m15-build1');
if (window.FIREFLIES_PORTAL_CONFIG) import('./session-access.js?v=3');
else { const portalConfig=document.createElement('script'); portalConfig.src='assets/js/portal-config.js?v=schedule2'; portalConfig.onload=()=>import('./session-access.js?v=3'); document.head.append(portalConfig); }
import('./meeting-time.js?v=attachment-loop-focus1');

async function initializeAccountMenu(header) {
  const config = await loadPortalConfig();
  const colorThemeKey = "fireflies-color-theme";
  const colorThemes = ["forest", "ocean", "violet", "sunset", "rose", "cobalt", "citrus", "slate", "berry", "mint", "lagoon", "ember"];
  const colorThemeNames = {forest:"Habitat Green",ocean:"Blue Current",violet:"Electric Violet",sunset:"Sunset Glow",rose:"Rose Quartz",cobalt:"Cobalt Circuit",citrus:"Crunchy Citrus",slate:"Cool Slate",berry:"Berry Burst",mint:"Fresh Mint",lagoon:"Lagoon Glow",ember:"Ember Trail"};
  const signIn = header.querySelector("[data-google-signin]");
  const signOut = header.querySelector("[data-signout]");
  const colorThemeButtons = [...document.querySelectorAll("[data-color-theme]")];
  const colorPaletteToggle = header.querySelector(".theme-palette-toggle");
  colorThemeButtons.forEach(button => {
    const name = colorThemeNames[button.dataset.colorTheme] || "Color theme";
    button.setAttribute("aria-label", name);
  });
  let activeColorThemeKey = "fireflies-color-theme";
  let saveProfileColorTheme = null;
  const selectColorTheme = theme => {
    const safeTheme = colorThemes.includes(theme) ? theme : "forest";
      document.documentElement.dataset.colorTheme = safeTheme;
      colorThemeButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.colorTheme === safeTheme)));
      if (colorPaletteToggle) {
        const name = colorThemeNames[safeTheme];
        colorPaletteToggle.setAttribute("aria-label", `Color theme: ${name}`);
      }
      localStorage.setItem(activeColorThemeKey, safeTheme);
      localStorage.setItem(colorThemeKey, safeTheme);
  };
  colorThemeButtons.forEach(button => button.addEventListener("click", () => {
    const theme = button.dataset.colorTheme;
    selectColorTheme(theme);
    saveProfileColorTheme?.(theme);
    const menu = header.querySelector(".theme-palette-menu");
    if (menu) { menu.hidden = true; colorPaletteToggle?.setAttribute("aria-expanded", "false"); }
  }));
  if (!config || config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) {
    signIn.addEventListener("click", () => { location.href = "login.html"; });
    return;
  }
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const mascot = header.querySelector(".signed-in-mascot");
    const outline = header.querySelector(".signed-out-icon");
    let avatarTarget = null;
    let avatarKind = null;
    const showSignedInAvatar = photoUrl => {
      mascot.src = photoUrl || "assets/img/habitat-builders-logo.png";
      mascot.classList.toggle("profile-photo", Boolean(photoUrl));
      mascot.removeAttribute("hidden");
      outline.setAttribute("hidden", "");
    };
    window.addEventListener("fireflies:profile-photo-updated", event => {
      if (avatarTarget && event.detail?.target === avatarTarget) showSignedInAvatar(event.detail.url || null);
    });
    window.addEventListener("fireflies:account-photo-updated", event => {
      if (avatarTarget && event.detail?.target === avatarTarget) showSignedInAvatar(event.detail.url || null);
    });
    const render = async session => {
      const profileLink = header.querySelector("[data-profile-link]");
      const adminLink = header.querySelector("[data-admin-link]");
      const settingsLink = header.querySelector("[data-settings-link]");
      const setAdminOnly = isAdmin => document.querySelectorAll("[data-admin-only]").forEach(element => element.hidden = !isAdmin);
      if (!session) {
        activeColorThemeKey = "fireflies-color-theme";
        selectColorTheme(localStorage.getItem(activeColorThemeKey) || "forest");
        avatarTarget = null;
        avatarKind = null;
        mascot.setAttribute("hidden", ""); outline.removeAttribute("hidden"); signIn.hidden = false; signOut.hidden = true;
        profileLink.hidden = true; adminLink.hidden = true; settingsLink.hidden = true;
        setAdminOnly(false);
        header.querySelector("[data-account-name]").textContent = "Team account";
        header.querySelector("[data-account-email]").textContent = "Not signed in";
        header.querySelector("[data-account-status]").textContent = "Google account required";
        return;
      }
      const fallbackName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Team member";
      const { data: profile } = await client.from("profiles").select("id,display_name,email,role,approval_status,linked_student_id,is_admin,color_theme").eq("id", session.user.id).maybeSingle();
      activeColorThemeKey = profile?.id ? `fireflies-color-theme-${profile.id}` : "fireflies-color-theme";
      saveProfileColorTheme = async theme => {
        const { error } = await client.rpc("set_my_color_theme", { new_theme: theme });
        if (error) window.FIREFLIES_DIAGNOSTICS?.report("Save color theme", error);
      };
      selectColorTheme(profile?.color_theme || localStorage.getItem(colorThemeKey) || localStorage.getItem(activeColorThemeKey) || "forest");
      const isAdmin = profile?.approval_status === "approved" && profile?.role === "coach" && (profile.is_admin || profile.email?.toLowerCase() === "sriram87@gmail.com");
      avatarTarget = profile?.id || null;
      avatarKind = profile?.role === "student" ? "student" : "account";
      let photoUrl = null;
      if (avatarTarget) {
        const detailsQuery = avatarKind === "student"
          ? client.from("student_details").select("photo_path").eq("student_id", avatarTarget).maybeSingle()
          : client.from("account_details").select("photo_path").eq("profile_id", avatarTarget).maybeSingle();
        const { data: details, error: detailsError } = await detailsQuery;
        if (detailsError) window.FIREFLIES_DIAGNOSTICS.report("Account photo", detailsError);
        if (details?.photo_path) {
          const bucket = avatarKind === "student" ? "profile-photos" : "account-photos";
          const { data: signed, error: photoError } = await client.storage.from(bucket).createSignedUrl(details.photo_path, 900);
          if (photoError) window.FIREFLIES_DIAGNOSTICS.report("Account photo", photoError);
          photoUrl = signed?.signedUrl || null;
        }
      }
      showSignedInAvatar(photoUrl); signIn.hidden = true; signOut.hidden = false;
      profileLink.hidden = profile?.approval_status !== "approved";
      profileLink.href = profile?.role === "student" ? "profile.html" : "account-profile.html";
      adminLink.hidden = !isAdmin;
      settingsLink.hidden = !isAdmin;
      setAdminOnly(isAdmin);
      header.querySelector("[data-account-name]").textContent = profile?.display_name || fallbackName;
      header.querySelector("[data-account-email]").textContent = session.user.email || "Google account";
      header.querySelector("[data-account-status]").textContent = profile?.approval_status === "approved" ? profile.role : "Waiting for coach approval";
    };
    signIn.addEventListener("click", async () => {
      // Supabase uses the fragment for OAuth credentials, so the destination
      // tab must travel in the query string instead of a competing hash.
      const redirectTo = new URL("portal.html?tab=homework", location.href).href;
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) {
        window.FIREFLIES_DIAGNOSTICS.report("Google sign-in", error);
        header.querySelector("[data-account-status]").textContent = "Sign-in is unavailable right now";
      }
    });
    signOut.addEventListener("click", async () => { await client.auth.signOut(); location.reload(); });
    const session = await restoreAccountSession(client);
    await render(session);
    client.auth.onAuthStateChange((_event, nextSession) => { render(nextSession); });
  } catch (error) {
    window.FIREFLIES_DIAGNOSTICS.report("Account menu", error);
    header.querySelector("[data-account-status]").textContent = "Account service unavailable";
    signIn.addEventListener("click", () => { location.href = "login.html"; });
  }
}

async function restoreAccountSession(client) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: { session } } = await client.auth.getSession();
    if (session) return session;
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250));
  }
  return null;
}

function loadPortalConfig() {
  if (window.FIREFLIES_PORTAL_CONFIG) return Promise.resolve(window.FIREFLIES_PORTAL_CONFIG);
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "assets/js/portal-config.js?v=auth2";
    script.onload = () => resolve(window.FIREFLIES_PORTAL_CONFIG);
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
}
