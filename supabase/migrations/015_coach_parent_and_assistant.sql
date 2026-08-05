-- Coaches may be linked as parents. Assistant coaches retain coach-level
-- homework, grading, relationship, and student-profile access, but not
-- account-approval/removal administration.
alter table public.profiles add column if not exists is_admin boolean not null default false;
update public.profiles set is_admin = true where role = 'coach' and is_admin = false;

create or replace function public.current_profile_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select is_admin from public.profiles where id=auth.uid() and role='coach' and approval_status='approved' and is_active),false)
$$;

drop function if exists public.pending_users();
create function public.pending_users()
returns table(id uuid,email text,display_name text,approval_status text,is_admin boolean)
language sql security definer set search_path=public as $$
  select p.id,p.email,p.display_name,p.approval_status,p.is_admin from public.profiles p
  where p.approval_status='pending' and public.current_profile_is_admin() order by p.display_name
$$;

drop function if exists public.admin_users();
create function public.admin_users()
returns table(id uuid,email text,display_name text,role text,linked_student_id uuid,linked_student_name text,is_admin boolean)
language sql security definer set search_path=public as $$
  select p.id,p.email,p.display_name,p.role,p.linked_student_id,child.display_name,p.is_admin
  from public.profiles p left join public.profiles child on child.id=p.linked_student_id
  where public.current_profile_role()='coach' and p.team_id=public.current_team_id() and p.approval_status='approved' and p.is_active
  order by case p.role when 'coach' then 0 when 'student' then 1 else 2 end,p.display_name
$$;

create or replace function public.approve_user(target_id uuid,target_role text,target_team uuid,target_student uuid,target_admin boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.current_profile_is_admin() then raise exception 'administrator access required'; end if;
  if target_role not in ('student','parent','coach') then raise exception 'invalid role'; end if;
  if target_team is distinct from public.current_team_id() then raise exception 'invalid team'; end if;
  if target_student is not null and target_role in ('parent','coach') and not exists(select 1 from public.profiles where id=target_student and team_id=current_team_id() and role='student' and approval_status='approved' and is_active) then raise exception 'invalid linked student'; end if;
  update public.profiles set role=target_role,team_id=target_team,linked_student_id=case when target_role in ('parent','coach') then target_student else null end,is_admin=(target_role='coach' and target_admin),approval_status='approved',approved_by=auth.uid(),approved_at=now() where id=target_id and approval_status='pending';
end; $$;

create or replace function public.approve_user(target_id uuid,target_role text,target_team uuid,target_student uuid default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.approve_user(target_id,target_role,target_team,target_student,false);
end; $$;

create or replace function public.remove_user_access(target_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.current_profile_is_admin() then raise exception 'administrator access required'; end if;
  if target_id=auth.uid() then raise exception 'cannot remove your own account'; end if;
  if not exists(select 1 from public.profiles where id=target_id and team_id=current_team_id()) then raise exception 'account not found in your team'; end if;
  update public.profiles set linked_student_id=null,is_active=false,approval_status='rejected',is_admin=false where id=target_id;
  update public.profiles set linked_student_id=null where linked_student_id=target_id;
end; $$;

create or replace function public.enforce_family_relationship()
returns trigger language plpgsql security definer set search_path=public as $$
declare child_team uuid; child_role text; child_status text; child_active boolean;
begin
  if new.linked_student_id is null then return new; end if;
  if new.role not in ('parent','coach') then raise exception 'only parent or coach accounts can link to a student'; end if;
  select team_id,role,approval_status,is_active into child_team,child_role,child_status,child_active from public.profiles where id=new.linked_student_id;
  if child_role is distinct from 'student' or child_team is distinct from new.team_id or child_status is distinct from 'approved' or child_active is distinct from true then raise exception 'an approved active student in the same team is required'; end if;
  if (select count(*) from public.profiles where role in ('parent','coach') and linked_student_id=new.linked_student_id and id<>new.id)>=2 then raise exception 'a student can have at most two linked parents'; end if;
  return new;
end; $$;

create or replace function public.family_relationships(target_user uuid)
returns table(id uuid,display_name text,role text) language plpgsql stable security definer set search_path=public as $$
declare target_role text; target_team uuid;
begin
  select p.role,p.team_id into target_role,target_team from public.profiles p where p.id=target_user and p.approval_status='approved' and p.is_active;
  if target_team is distinct from current_team_id() or (target_user<>auth.uid() and current_profile_role()<>'coach') then raise exception 'relationship access denied'; end if;
  if target_role in ('parent','coach') then return query select c.id,c.display_name,c.role from public.profiles p join public.profiles c on c.id=p.linked_student_id where p.id=target_user and c.approval_status='approved' and c.is_active;
  elsif target_role='student' then return query select p.id,p.display_name,p.role from public.profiles p where p.role in ('parent','coach') and p.linked_student_id=target_user and p.approval_status='approved' and p.is_active order by p.display_name;
  end if;
end; $$;

create or replace function public.set_parent_student(target_parent uuid,target_student uuid)
returns void language plpgsql security definer set search_path=public as $$
declare me_role text:=current_profile_role(); current_student uuid;
begin
  if me_role<>'coach' and target_parent<>auth.uid() and target_student is distinct from auth.uid() then raise exception 'relationship access denied'; end if;
  if not exists(select 1 from profiles p where p.id=target_parent and p.team_id=current_team_id() and p.role in ('parent','coach') and p.approval_status='approved' and p.is_active) then raise exception 'approved parent or coach not found'; end if;
  select linked_student_id into current_student from profiles where id=target_parent;
  if me_role='student' and current_student is not null and current_student is distinct from target_student then raise exception 'this parent is already linked to another student'; end if;
  if target_student is not null and not exists(select 1 from profiles s where s.id=target_student and s.team_id=current_team_id() and s.role='student' and s.approval_status='approved' and s.is_active) then raise exception 'approved student not found'; end if;
  update profiles set linked_student_id=target_student where id=target_parent;
end; $$;

create or replace function public.set_student_parents(target_student uuid,target_parents uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare parent_ids uuid[]:=coalesce(target_parents,array[]::uuid[]);
begin
  if current_profile_role()<>'coach' and target_student<>auth.uid() then raise exception 'relationship access denied'; end if;
  if not exists(select 1 from profiles s where s.id=target_student and s.team_id=current_team_id() and s.role='student' and s.approval_status='approved' and s.is_active) then raise exception 'approved student not found'; end if;
  if cardinality(parent_ids)>2 or cardinality(parent_ids)<>(select count(distinct value) from unnest(parent_ids) value) then raise exception 'select no more than two different parents'; end if;
  if exists(select 1 from unnest(parent_ids) parent_id where not exists(select 1 from profiles p where p.id=parent_id and p.team_id=current_team_id() and p.role in ('parent','coach') and p.approval_status='approved' and p.is_active)) then raise exception 'approved parent or coach not found'; end if;
  if current_profile_role()='student' and exists(select 1 from profiles p where p.id=any(parent_ids) and p.linked_student_id is not null and p.linked_student_id<>target_student) then raise exception 'a selected parent is already linked to another student'; end if;
  update profiles set linked_student_id=null where role in ('parent','coach') and linked_student_id=target_student and not (id=any(parent_ids));
  update profiles set linked_student_id=target_student where id=any(parent_ids);
end; $$;

revoke all on function public.current_profile_is_admin() from public; grant execute on function public.current_profile_is_admin() to authenticated;
revoke all on function public.pending_users() from public; grant execute on function public.pending_users() to authenticated;
revoke all on function public.admin_users() from public; grant execute on function public.admin_users() to authenticated;
revoke all on function public.approve_user(uuid,text,uuid,uuid,boolean) from public; grant execute on function public.approve_user(uuid,text,uuid,uuid,boolean) to authenticated;
revoke all on function public.approve_user(uuid,text,uuid,uuid) from public; grant execute on function public.approve_user(uuid,text,uuid,uuid) to authenticated;
revoke all on function public.remove_user_access(uuid) from public; grant execute on function public.remove_user_access(uuid) to authenticated;
