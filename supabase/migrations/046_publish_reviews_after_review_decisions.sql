-- A coach explicitly publishes review outcomes once every approved student
-- has a clear next step: revise or complete. Written feedback is encouraged
-- and is required for a revision request, but completion can stand on its own.
create or replace function public.publish_homework_reviews(target_assignment uuid)
returns table(ready boolean, reviewed_students integer, total_students integer)
language plpgsql security definer set search_path=public as $$
declare
  assignment_team uuid;
  total_count integer;
  reviewed_count integer;
begin
  if current_profile_role() not in ('coach','student_coach') then
    raise exception 'coach access required';
  end if;

  select a.team_id into assignment_team
  from public.assignments a
  where a.id = target_assignment and a.published;

  if assignment_team is null or assignment_team is distinct from current_team_id() then
    raise exception 'assignment not found';
  end if;

  select count(*) into total_count
  from public.profiles p
  where p.team_id = assignment_team and p.role = 'student'
    and p.approval_status = 'approved' and p.is_active;

  select count(*) into reviewed_count
  from public.profiles p
  where p.team_id = assignment_team and p.role = 'student'
    and p.approval_status = 'approved' and p.is_active
    and exists (
      select 1 from public.submissions s
      where s.assignment_id = target_assignment and s.student_id = p.id
        and s.status in ('revise', 'complete')
    );

  if total_count = 0 or reviewed_count < total_count then
    raise exception 'a review decision is required for every approved student (% of % decided)', reviewed_count, total_count;
  end if;

  update public.assignments
  set reviews_published = true,
      reviews_published_at = now(),
      reviews_published_by = auth.uid()
  where id = target_assignment;

  return query select true, reviewed_count, total_count;
end;
$$;

revoke all on function public.publish_homework_reviews(uuid) from public;
grant execute on function public.publish_homework_reviews(uuid) to authenticated;

-- Older cached pages must not publish a review automatically.
create or replace function public.release_homework_reviews(target_assignment uuid)
returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if current_profile_role() not in ('coach','student_coach') then
    raise exception 'coach access required';
  end if;
  return false;
end;
$$;

revoke all on function public.release_homework_reviews(uuid) from public;
grant execute on function public.release_homework_reviews(uuid) to authenticated;
