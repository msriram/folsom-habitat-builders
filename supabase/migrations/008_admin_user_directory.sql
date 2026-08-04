-- Coach-only directory used by the approval screen.
create or replace function public.admin_users()
returns table(
  id uuid,
  email text,
  display_name text,
  role text,
  linked_student_id uuid,
  linked_student_name text
)
language sql
security definer
set search_path=public
as $$
  select p.id,
         p.email,
         p.display_name,
         p.role,
         p.linked_student_id,
         child.display_name as linked_student_name
  from profiles p
  left join profiles child on child.id=p.linked_student_id
  where current_profile_role()='coach'
    and p.team_id=current_team_id()
    and p.approval_status='approved'
    and p.is_active
  order by case p.role when 'coach' then 0 when 'student' then 1 else 2 end,
           p.display_name;
$$;

revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated;
revoke execute on function public.admin_users() from anon;
