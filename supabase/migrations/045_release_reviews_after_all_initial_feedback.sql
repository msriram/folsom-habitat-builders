-- Release a homework review only once every approved student has initial
-- written coach feedback. Completion is intentionally not part of this rule.
drop function if exists public.release_homework_reviews(uuid);
create function public.release_homework_reviews(target_assignment uuid)
returns boolean
language plpgsql security definer set search_path=public as $$
declare
  assignment_team uuid;
  total_students integer;
  reviewed_students integer;
begin
  if current_profile_role() not in ('coach','student_coach') then
    raise exception 'coach access required';
  end if;
  select team_id into assignment_team from public.assignments
  where id = target_assignment and published and team_id = current_team_id();
  if assignment_team is null then raise exception 'assignment not found'; end if;
  select count(*) into total_students from public.profiles p
  where p.team_id=assignment_team and p.role='student' and p.approval_status='approved' and p.is_active;
  select count(*) into reviewed_students from public.profiles p
  where p.team_id=assignment_team and p.role='student' and p.approval_status='approved' and p.is_active
    and exists (select 1 from public.submissions s where s.assignment_id=target_assignment and s.student_id=p.id and length(trim(coalesce(s.coach_feedback,''))) > 0);
  if total_students > 0 and reviewed_students >= total_students then
    update public.assignments set reviews_published=true, reviews_published_at=coalesce(reviews_published_at,now()), reviews_published_by=coalesce(reviews_published_by,auth.uid()) where id=target_assignment;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function public.release_homework_reviews(uuid) from public;
grant execute on function public.release_homework_reviews(uuid) to authenticated;

-- Undo any premature release from the prior first-review behavior.
update public.assignments a
set reviews_published=false, reviews_published_at=null, reviews_published_by=null
where a.team_id='b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.reviews_published
  and (select count(*) from public.profiles p where p.team_id=a.team_id and p.role='student' and p.approval_status='approved' and p.is_active)
      > (select count(*) from public.profiles p where p.team_id=a.team_id and p.role='student' and p.approval_status='approved' and p.is_active and exists (select 1 from public.submissions s where s.assignment_id=a.id and s.student_id=p.id and length(trim(coalesce(s.coach_feedback,''))) > 0));
