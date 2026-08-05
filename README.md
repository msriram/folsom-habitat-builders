# Folsom FLL Team Hub

This repository powers the shared website for a five-student FIRST LEGO League team during the 2026–27 season. It is designed as a practical team workspace—not a marketing site.

## Live website

[Open the Folsom FLL Team Hub](https://msriram.github.io/folsom-fireflies/)

## What the website is for

The site keeps the season’s work connected in one place:

- Meeting schedule with a dedicated plan for every session
- Coach-managed completion checklists and week-based progress
- Weekly homework aligned with upcoming meetings
- Student homework submissions and coach review
- Robot mission references, practice links, and test records
- Beginner coding tutorials with saved team projects
- Innovation Project research and official season resources
- Core Values and tournament preparation
- Private roster with team-visible student photos and profiles
- Reciprocal family relationships: one student per parent and up to two parents per student
- Parent-and-coach accounting records
- Coach-only user approvals and integration settings
- A scoped **Ask AI** research assistant planned for approved team accounts

## How it works

The public interface is hosted by GitHub Pages. Supabase provides Google authentication, account approval, the PostgreSQL database, private file storage, and role-based access controls.

Access is separated by role:

- **Students** see team learning material and manage their own work.
- **Parents** see only information associated with their linked child.
- **Coaches** review the whole team, approve accounts, manage assignments, update schedule completion, and administer team records.

The website avoids publishing children’s contact information, precise meeting locations, private submissions, or identifiable media without appropriate parent permission.

## Repository guide

- `index.html` — team hub and current schedule
- `season.html` and `meeting-*.html` — season calendar and session plans
- `portal.html` — authenticated Team Room
- `robot.html`, `project.html`, and `resources.html` — season working references
- `assets/` — shared styles, scripts, and images
- `supabase/migrations/` — database schema and access policies
- `supabase/functions/` — server-side integrations
- `docs/` — operations, deployment, privacy, and development notes

## Development

Local preview, publishing, repository structure, and implementation notes are maintained in [Developer Guide](docs/DEVELOPMENT.md).

Portal architecture and access-control details are documented in [Team Room Deployment](docs/PORTAL_SETUP.md).

## License

The site code is available under the MIT License. Team media and artwork may have separate permissions and should not be reused without authorization.
