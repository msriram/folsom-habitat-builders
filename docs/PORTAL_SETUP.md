# Team Room deployment

The published Team Room starts in demo mode. It stores sample changes only in the current browser's `localStorage`. It is not authentication and must not be used for real student information.

## Live architecture

Use GitHub Pages for the public interface and Supabase for authentication, PostgreSQL, private file storage, Row Level Security, realtime data, and Edge Functions. Never put service-role, OpenAI, Resend, or WhatsApp secrets in browser JavaScript.

Roles:

- `student`: team-visible questions, own submissions, projects, tests, and journal entries.
- `parent`: only the linked student's progress, feedback, logistics, and notification preferences.
- `coach`: assignments, reviews, moderation, publication, exports, account controls, and accounting.

Use aliases (`Firefly 1` through `Firefly 5`) in team displays. Do not collect birthdays, home addresses, school schedules, or unnecessary identifiers. Disable private student-to-student messaging. Require coach approval for public content.

## Before live mode

1. Obtain parent consent and publish privacy/retention/contact procedures.
2. Create Supabase tables and enable Row Level Security on every exposed table.
3. Create private buckets for submissions and original receipts.
4. Implement signed URLs for authorized file access.
5. Deploy Edge Functions for the Firefly Guide and notifications.
6. Add rate limits, input/output moderation, audit history, and a coach AI shutdown switch.
7. Test every student/parent/coach access boundary with separate accounts.

See `NOTIFICATIONS.md` for delivery requirements.
