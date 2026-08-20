-- A homework review becomes available as soon as a coach records the first
-- review. Completion remains a separate student workflow status.
create or replace function public.release_homework_reviews(target_assignment uuid)
returns void
language plpgsql security definer set search_path=public as $$
begin
  if current_profile_role() not in ('coach','student_coach') then
    raise exception 'coach access required';
  end if;
  if not exists (
    select 1 from public.assignments a
    where a.id = target_assignment and a.team_id = current_team_id() and a.published
  ) then
    raise exception 'assignment not found';
  end if;
  update public.assignments
  set reviews_published = true,
      reviews_published_at = coalesce(reviews_published_at, now()),
      reviews_published_by = coalesce(reviews_published_by, auth.uid())
  where id = target_assignment;
end;
$$;
revoke all on function public.release_homework_reviews(uuid) from public;
grant execute on function public.release_homework_reviews(uuid) to authenticated;
