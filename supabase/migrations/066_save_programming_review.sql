-- Save programming feedback through a narrowly scoped coach function.  This
-- keeps review saves reliable even when the browser's row-update policy cache
-- is stale, while preserving the same team boundary.
create or replace function public.save_robot_homework_review(
  target_submission uuid,
  new_score numeric,
  new_feedback text
) returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if public.current_profile_role() not in ('coach', 'student_coach') then
    raise exception 'coach access required';
  end if;
  if new_score is not null and (new_score < 0 or new_score > 10) then
    raise exception 'score must be between 0 and 10';
  end if;
  update public.robot_homework_submissions submission
  set score = new_score,
      coach_feedback = coalesce(new_feedback, ''),
      updated_at = now()
  where submission.id = target_submission
    and exists (
      select 1
      from public.robot_homework_tasks task
      where task.id = submission.task_id
        and task.team_id = public.current_team_id()
    );
  if not found then
    raise exception 'programming submission not found';
  end if;
end;
$$;

revoke all on function public.save_robot_homework_review(uuid, numeric, text) from public;
grant execute on function public.save_robot_homework_review(uuid, numeric, text) to authenticated;
