(() => {
  const navItems = [
    ["Home", "index.html"],
    ["Season", "season.html"],
    ["Team", "team.html"],
    ["Project", "project.html"],
    ["Robot", "robot.html"],
    ["Journal", "journal.html"]
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
            <span>Folsom Fireflies<small>BIOGLOW · 2026–27</small></span>
          </a>
          <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
          <nav class="site-nav" id="site-nav" aria-label="Main navigation">
            ${navItems.map(([label, href]) => `<a href="${href}" ${page === label ? 'aria-current="page"' : ''}>${label}</a>`).join("")}
          </nav>
        </div>
      </div>`;

    const menu = header.querySelector(".menu-button");
    const nav = header.querySelector(".site-nav");
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });
  }

  const footer = document.querySelector("[data-site-footer]");
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <a class="brand" href="index.html"><img src="assets/img/logo.svg" alt="" width="48" height="48"><span>Folsom Fireflies<small>Learn · Build · Test · Share</small></span></a>
              <p>This family-run team site documents our 2026–27 robotics and biodiversity journey.</p>
            </div>
            <div><strong>Explore</strong><p><a href="season.html">Season plan</a><br><a href="project.html">Innovation Project</a><br><a href="robot.html">Robot Game</a></p></div>
            <div><strong>Privacy</strong><p><small>We avoid publishing children's full names, contact information, school schedules, or identifiable photos without parent permission.</small></p></div>
          </div>
          <div class="footer-bottom"><small>© <span data-year></span> Folsom Fireflies</small><small>Independent community team site. FIRST® and LEGO® are trademarks of their respective owners.</small></div>
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
