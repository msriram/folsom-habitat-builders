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
  window.addEventListener("error", event => window.FIREFLIES_DIAGNOSTICS.report("Browser", event.error || event.message));
  window.addEventListener("unhandledrejection", event => window.FIREFLIES_DIAGNOSTICS.report("Browser", event.reason));

  const savedTheme = localStorage.getItem("fireflies-theme");
  const initialTheme = savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = initialTheme;

  const navItems = [
    ["Home", "index.html"],
    ["Homework", "portal.html#homework"],
    ["Team", "roster.html"],
    ["Schedule", "season.html"],
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
            <img src="assets/img/logo.svg" alt="" width="48" height="48">
            <span>Folsom FLL Team<small>FLL Challenge · 2026–27</small></span>
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
            <button class="round-control theme-toggle" type="button" aria-label="Switch to night mode" title="Switch to night mode">
              <svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
              <svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg>
            </button>
            <div class="account-menu-wrap">
              <button class="round-control account-button" type="button" aria-label="Open account menu" aria-expanded="false" aria-controls="account-menu">
                <svg class="signed-out-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.8 20c.7-4 3.1-6 7.2-6s6.5 2 7.2 6"/></svg>
                <img class="signed-in-mascot" src="assets/img/logo.svg" alt="" hidden>
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
      themeButton.title = label;
    };
    setThemeButton();
    themeButton.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("fireflies-theme", next);
      setThemeButton();
    });

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
              <a class="brand" href="index.html"><img src="assets/img/logo.svg" alt="" width="48" height="48"><span>Folsom FLL Team<small>Learn · Build · Test · Share</small></span></a>
              <p>Schedules, assignments, robot work, project research, and family information for the 2026–27 season.</p>
            </div>
            <div><strong>Focus areas</strong><p><a href="robot.html">Robot Challenge</a><br><a href="project.html">Innovation Project</a><br><a href="core-values.html">Core Values</a><br><a href="tournament.html">Tournament Format</a><br><a href="resources.html">Official Resources</a></p></div>
            <div><strong>Privacy</strong><p><small>We avoid publishing children's full names, contact information, school schedules, or identifiable photos without parent permission.</small></p></div>
          </div>
          <div class="footer-bottom"><small>© <span data-year></span> Folsom FLL Team</small><small>Independent community team site. FIRST® and LEGO® are trademarks of their respective owners.</small></div>
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
})();
if (document.body.dataset.session) import('./session-materials.js?v=1');
import('./meeting-time.js?v=1');

async function initializeAccountMenu(header) {
  const config = await loadPortalConfig();
  const signIn = header.querySelector("[data-google-signin]");
  const signOut = header.querySelector("[data-signout]");
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
      mascot.src = photoUrl || "assets/img/logo.svg";
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
      const { data: profile } = await client.from("profiles").select("id,display_name,email,role,approval_status,linked_student_id,is_admin").eq("id", session.user.id).maybeSingle();
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
    const { data: { session } } = await client.auth.getSession();
    await render(session);
    client.auth.onAuthStateChange((_event, nextSession) => { render(nextSession); });
  } catch (error) {
    window.FIREFLIES_DIAGNOSTICS.report("Account menu", error);
    header.querySelector("[data-account-status]").textContent = "Account service unavailable";
    signIn.addEventListener("click", () => { location.href = "login.html"; });
  }
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
