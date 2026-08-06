-- A coach may also be linked to a student they support (for example, a coach who
-- is also that student's parent). This is an administrative relationship only;
-- it does not consume one of the student's two parent links.

alter table public.profiles
  drop constraint if exists profiles_parent_linked_child;

alter table public.profiles
  add constraint profiles_parent_linked_child
  check (role in ('parent', 'coach') or linked_student_id is null);

create or replace function public.family_relationship_options(option_role text)
returns table(id uuid, display_name text, role text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me_role text := public.current_profile_role();
begin
  if option_role not in ('student', 'parent', 'adult') then
    raise exception 'invalid relationship role';
  end if;

  if me_role not in ('student', 'parent', 'coach')
     or (me_role = 'student' and option_role not in ('parent', 'adult'))
     or (me_role in ('parent', 'coach') and option_role <> 'student') then
    raise exception 'relationship directory is not available';
  end if;

  return query
    select person.id, person.display_name, person.role
    from public.profiles person
    where person.team_id = public.current_team_id()
      and (case when option_role = 'adult' then person.role in ('parent', 'coach') else person.role = option_role end)
      and person.approval_status = 'approved'
      and person.is_active
      and (me_role <> 'student' or person.linked_student_id is null or person.linked_student_id = auth.uid())
    order by person.display_name;
end;
$$;

grant execute on function public.family_relationship_options(text) to authenticated;

create or replace function public.family_relationships(target_user uuid)
returns table(id uuid, display_name text, role text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_role text;
  target_team uuid;
begin
  select p.role, p.team_id
    into target_role, target_team
  from public.profiles p
  where p.id = target_user
    and p.approval_status = 'approved'
    and p.is_active;

  if target_team is distinct from current_team_id()
     or (target_user <> auth.uid() and current_profile_role() <> 'coach') then
    raise exception 'relationship access denied';
  end if;

  if target_role in ('parent', 'coach') then
    return query
      select child.id, child.display_name, child.role
      from public.profiles adult
      join public.profiles child on child.id = adult.linked_student_id
      where adult.id = target_user
        and child.approval_status = 'approved'
        and child.is_active;
  elsif target_role = 'student' then
    return query
      select adult.id, adult.display_name, adult.role
      from public.profiles adult
      where adult.role in ('parent', 'coach')
        and adult.linked_student_id = target_user
        and adult.approval_status = 'approved'
        and adult.is_active
      order by adult.display_name;
  end if;
end;
$$;

grant execute on function public.family_relationships(uuid) to authenticated;

create or replace function public.enforce_family_relationship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  child_team uuid;
  child_role text;
  child_status text;
  child_active boolean;
begin
  if new.linked_student_id is null then
    return new;
  end if;

  if new.role not in ('parent', 'coach') then
    raise exception 'only parent or coach accounts can link to a student';
  end if;

  select team_id, role, approval_status, is_active
    into child_team, child_role, child_status, child_active
  from public.profiles
  where id = new.linked_student_id;

  if child_role is distinct from 'student'
     or child_team is distinct from new.team_id
     or child_status is distinct from 'approved'
     or child_active is distinct from true then
    raise exception 'an approved active student in the same team is required';
  end if;

  if new.role = 'parent' and (
    select count(*)
    from public.profiles
    where role = 'parent'
      and linked_student_id = new.linked_student_id
      and id <> new.id
  ) >= 2 then
    raise exception 'a student can have at most two linked parents';
  end if;

  return new;
end;
$$;

create or replace function public.set_parent_student(target_parent uuid, target_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_profile_role() <> 'coach' then
    raise exception 'coach access required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_parent
      and team_id = current_team_id()
      and role in ('parent', 'coach')
      and approval_status = 'approved'
      and is_active
  ) then
    raise exception 'approved parent or coach not found';
  end if;

  if target_student is not null and not exists (
    select 1 from public.profiles
    where id = target_student
      and team_id = current_team_id()
      and role = 'student'
      and approval_status = 'approved'
      and is_active
  ) then
    raise exception 'approved student not found';
  end if;

  update public.profiles
  set linked_student_id = target_student
  where id = target_parent;
end;
$$;

create or replace function public.set_student_parents(target_student uuid, target_parents uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_profile_role() <> 'coach' then
    raise exception 'coach access required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_student
      and team_id = current_team_id()
      and role = 'student'
      and approval_status = 'approved'
      and is_active
  ) then
    raise exception 'approved student not found';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_parents, array[]::uuid[])) as requested(id)
    where not exists (
      select 1 from public.profiles
      where id = requested.id
        and team_id = current_team_id()
        and role in ('parent', 'coach')
        and approval_status = 'approved'
        and is_active
    )
  ) then
    raise exception 'approved parent or coach not found';
  end if;

  update public.profiles
  set linked_student_id = null
  where team_id = current_team_id()
    and role in ('parent', 'coach')
    and linked_student_id = target_student;

  update public.profiles
  set linked_student_id = target_student
  where id = any(coalesce(target_parents, array[]::uuid[]));
end;
$$;

grant execute on function public.set_parent_student(uuid, uuid) to authenticated;
grant execute on function public.set_student_parents(uuid, uuid[]) to authenticated;
