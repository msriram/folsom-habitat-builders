# Folsom FLL Team

Expandable static website for the Folsom FLL Team' 2026–27 FLL Challenge season.

## Live site

After GitHub Pages is enabled, the site should be available at:

`https://msriram.github.io/folsom-fireflies/`

## Structure

- `index.html` — home and current season dashboard
- `season.html` — roadmap, meetings, and logistics
- `team.html` — five-student role model and adult responsibilities
- `project.html` — Innovation Project direction and prototype ideas
- `robot.html` — robot design and test strategy
- `journal.html` — updates rendered from `assets/js/site-data.js`
- `assets/css/styles.css` — all visual styles
- `assets/js/site-data.js` — easy-to-edit progress and journal data
- `.github/workflows/pages.yml` — automatic GitHub Pages deployment

## Local preview

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Publish

```bash
git init
git add .
git commit -m "Launch Folsom FLL Team team site"
git branch -M main
git remote add origin git@github.com:msriram/folsom-fireflies.git
git push -u origin main
```

Then, in GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions**.
3. The included workflow deploys on every push to `main`.

## Routine updates

Edit `assets/js/site-data.js` to update progress percentages or add journal entries.

```bash
git add assets/js/site-data.js
git commit -m "Update season journal"
git push
```

## Child privacy

Do not publish children's full names, contact details, school schedules, precise meeting locations, or identifiable media without explicit parent permission.

## License

MIT for site code. Team photos and generated artwork should be reused only with appropriate permission.
