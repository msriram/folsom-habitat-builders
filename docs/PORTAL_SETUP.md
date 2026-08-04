# Team Room deployment

The published Team Room starts in demo mode. It stores sample changes only in the current browser's `localStorage`. It is not authentication and must not be used for real student information.

## Live architecture

Use GitHub Pages for the public interface and Supabase for authentication, PostgreSQL, private file storage, Row Level Security, realtime data, and Edge Functions. Never put service-role, OpenAI, Resend, or WhatsApp secrets in browser JavaScript.

Roles:

- `student`: team-visible questions, own submissions, projects, tests, and journal entries.
- `parent`: only the linked student's progress, feedback, logistics, and notification preferences.
- `coach`: assignments, reviews, moderation, publication, exports, account controls, and accounting.

Use aliases (`Student 1` through `Student 5`) in team displays. Do not collect birthdays, home addresses, school schedules, or unnecessary identifiers. Disable private student-to-student messaging. Require coach approval for public content.

## Before live mode

1. Obtain parent consent and publish privacy/retention/contact procedures.
2. Create Supabase tables and enable Row Level Security on every exposed table.
3. Create private buckets for submissions and original receipts.
4. Implement signed URLs for authorized file access.
5. Deploy Edge Functions for the Ask AI and notifications.
6. Add rate limits, input/output moderation, audit history, and a coach AI shutdown switch.
7. Test every student/parent/coach access boundary with separate accounts.

## Google login and approval

Enable Google in Supabase Authentication, configure the Google OAuth client and approved redirect URLs, then set `supabaseUrl`, `supabaseAnonKey`, and `forceDemo: false` in `assets/js/portal-config.js`. Create the first coach profile manually as an approved administrator. New accounts remain `pending` until that coach assigns a team, role, and optional linked student.

Apply migrations in order. `002_approval_and_records.sql` adds persistent accounting and reusable team-data policies. Review them in a staging project before production.

Apply `003_private_roster_profiles.sql` for private student profiles and then
`004_family_access_boundaries.sql`. The fourth migration enforces the central
privacy rule: coaches can review the full team, while parents can retrieve only
the homework, questions, code, robot tests, and feedback for their linked child.

`003_private_roster_profiles.sql` adds the private roster and optional student profile. Enter real roster names only through the authenticated admin workflow or Supabase dashboard. Do not add a roster seed file to this public repository. Height, weight, and food-safety notes are private and should be collected only with parent agreement, used for a specific purpose, and deleted when no longer needed.

The same migration creates a private `profile-photos` Storage bucket limited to JPEG, PNG, and WebP files up to 5 MB. Access policies use the student folder ID and `can_manage_student`; never make this bucket public.

See `NOTIFICATIONS.md` for delivery requirements.
