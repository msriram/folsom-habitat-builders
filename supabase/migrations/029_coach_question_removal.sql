-- Coaches may curate Ask AI history for their own team.
drop policy if exists question_delete_by_coach on public.questions;

create policy question_delete_by_coach on public.questions
for delete using (
  team_id = current_team_id()
  and current_profile_role() in ('coach', 'student_coach')
);
