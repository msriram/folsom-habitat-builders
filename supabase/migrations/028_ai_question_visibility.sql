-- Ask AI: student questions are a shared team learning resource. Questions
-- from adult accounts remain private, while coaches can supervise student use.
drop policy if exists question_read_by_role on public.questions;

create policy question_read_by_role on public.questions
for select using (
  author_id = auth.uid()
  or (
    team_id = current_team_id()
    and current_profile_role() in ('student', 'coach', 'student_coach')
    and exists (
      select 1 from public.profiles author
      where author.id = questions.author_id and author.role = 'student'
    )
  )
);
