-- A coach's published session recap includes the attendance and student notes
-- saved for that same session. Unpublished sessions remain coach-only.
drop policy if exists session_student_reviews_team_published_read on public.session_student_reviews;
create policy session_student_reviews_team_published_read on public.session_student_reviews
for select using (
  team_id = public.current_team_id()
  and exists (
    select 1 from public.schedule_sessions session
    where session.team_id = session_student_reviews.team_id
      and session.session_key = session_student_reviews.session_key
      and session.published = true
  )
);
