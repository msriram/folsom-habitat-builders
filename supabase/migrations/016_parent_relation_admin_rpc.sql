-- Allow the coach approval page to update an already-approved parent link.
create or replace function public.set_parent_student(target_parent uuid,target_student uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if current_profile_role() <> 'coach' then raise exception 'coach access required'; end if;
  if not exists (select 1 from profiles where id=target_parent and team_id=current_team_id() and role='parent' and approval_status='approved' and is_active) then raise exception 'approved parent not found'; end if;
  if target_student is not null and not exists (select 1 from profiles where id=target_student and team_id=current_team_id() and role='student' and approval_status='approved' and is_active) then raise exception 'approved student not found'; end if;
  update profiles set linked_student_id=target_student where id=target_parent;
end; $$;

revoke all on function public.set_parent_student(uuid,uuid) from public;
grant execute on function public.set_parent_student(uuid,uuid) to authenticated;
