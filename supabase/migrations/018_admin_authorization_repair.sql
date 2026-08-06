-- Repair projects created before the administrator migration was applied.
-- The designated lead coach is the sole account administrator; other coaches
-- retain coaching permissions but cannot approve or remove accounts.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

update public.profiles
set is_admin = (role = 'coach' and lower(email) = 'sriram87@gmail.com');

create or replace function public.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_admin
    from public.profiles
    where id = auth.uid()
      and role = 'coach'
      and approval_status = 'approved'
      and is_active
  ), false)
$$;

create or replace function public.approve_user(
  target_id uuid,
  target_role text,
  target_team uuid,
  target_student uuid,
  target_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception 'administrator access required';
  end if;
  if target_role not in ('student', 'parent', 'coach') then
    raise exception 'invalid role';
  end if;
  if target_team is distinct from public.current_team_id() then
    raise exception 'invalid team';
  end if;
  if target_student is not null and target_role in ('parent', 'coach') and not exists (
    select 1 from public.profiles
    where id = target_student
      and team_id = current_team_id()
      and role = 'student'
      and approval_status = 'approved'
      and is_active
  ) then
    raise exception 'invalid linked student';
  end if;

  update public.profiles
  set role = target_role,
      team_id = target_team,
      linked_student_id = case when target_role in ('parent', 'coach') then target_student else null end,
      is_admin = (target_role = 'coach' and target_admin),
      approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      is_active = true
  where id = target_id
    and approval_status = 'pending';
end;
$$;

create or replace function public.approve_user(
  target_id uuid,
  target_role text,
  target_team uuid,
  target_student uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.approve_user(target_id, target_role, target_team, target_student, false);
end;
$$;

create or replace function public.remove_user_access(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception 'administrator access required';
  end if;
  if target_id = auth.uid() then
    raise exception 'cannot remove your own account';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target_id
      and team_id = public.current_team_id()
  ) then
    raise exception 'account not found in your team';
  end if;

  update public.profiles
  set linked_student_id = null,
      is_active = false,
      approval_status = 'rejected',
      is_admin = false
  where id = target_id;

  update public.profiles
  set linked_student_id = null
  where linked_student_id = target_id;
end;
$$;

revoke all on function public.current_profile_is_admin() from public;
grant execute on function public.current_profile_is_admin() to authenticated;
revoke all on function public.approve_user(uuid, text, uuid, uuid, boolean) from public;
grant execute on function public.approve_user(uuid, text, uuid, uuid, boolean) to authenticated;
revoke all on function public.approve_user(uuid, text, uuid, uuid) from public;
grant execute on function public.approve_user(uuid, text, uuid, uuid) to authenticated;
revoke all on function public.remove_user_access(uuid) from public;
grant execute on function public.remove_user_access(uuid) to authenticated;

create or replace function public.tshirt_order()
returns table(display_name text, tshirt_size text)
language sql
security definer
set search_path = public
as $$
  select p.display_name, d.tshirt_size
  from public.profiles p
  left join public.student_details d on d.student_id = p.id
  where p.team_id = public.current_team_id()
    and p.role = 'student'
    and p.approval_status = 'approved'
    and public.current_profile_is_admin()
  order by p.display_name
$$;

revoke all on function public.tshirt_order() from public;
grant execute on function public.tshirt_order() to authenticated;
