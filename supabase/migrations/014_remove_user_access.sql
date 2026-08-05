-- Coach-only account removal. Keep the profile and all learning records for audit/history,
-- but revoke workspace access and clear family links.
create or replace function public.remove_user_access(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() <> 'coach' then
    raise exception 'coach access required';
  end if;
  if target_id = auth.uid() then
    raise exception 'cannot remove your own account';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target_id and team_id = public.current_team_id()
  ) then
    raise exception 'account not found in your team';
  end if;

  update public.profiles
  set linked_student_id = null,
      is_active = false,
      approval_status = 'rejected'
  where id = target_id;

  update public.profiles
  set linked_student_id = null
  where linked_student_id = target_id;
end;
$$;

revoke all on function public.remove_user_access(uuid) from public;
grant execute on function public.remove_user_access(uuid) to authenticated;
revoke execute on function public.remove_user_access(uuid) from anon;
