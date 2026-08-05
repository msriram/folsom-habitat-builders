-- Reciprocal family relationships and team-visible student photos.

create or replace function public.can_view_team_student(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles student
      on student.id = target
     and student.team_id = me.team_id
     and student.role = 'student'
     and student.approval_status = 'approved'
     and student.is_active
    where me.id = auth.uid()
      and me.approval_status = 'approved'
      and me.is_active
      and me.role in ('student', 'parent', 'coach')
  );
$$;

revoke all on function public.can_view_team_student(uuid) from public;
revoke execute on function public.can_view_team_student(uuid) from anon;
grant execute on function public.can_view_team_student(uuid) to authenticated;

drop policy if exists profile_photo_read on storage.objects;
create policy profile_photo_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and public.can_view_team_student(((storage.foldername(name))[1])::uuid)
  );

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

  if new.role <> 'parent' then
    raise exception 'only parent accounts can link to a student';
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

  if (
    select count(*)
    from public.profiles parent
    where parent.role = 'parent'
      and parent.linked_student_id = new.linked_student_id
      and parent.id <> new.id
  ) >= 2 then
    raise exception 'a student can have at most two linked parents';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_family_relationship() from public;
revoke execute on function public.enforce_family_relationship() from anon;

drop trigger if exists enforce_family_relationship_on_profiles on public.profiles;
create trigger enforce_family_relationship_on_profiles
before insert or update of role, team_id, linked_student_id on public.profiles
for each row
execute function public.enforce_family_relationship();

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
  if option_role not in ('student', 'parent') then
    raise exception 'invalid relationship role';
  end if;

  if me_role not in ('student', 'parent', 'coach')
     or (me_role = 'student' and option_role <> 'parent')
     or (me_role = 'parent' and option_role <> 'student') then
    raise exception 'relationship directory is not available';
  end if;

  return query
  select person.id, person.display_name, person.role
  from public.profiles person
  where person.team_id = public.current_team_id()
    and person.role = option_role
    and person.approval_status = 'approved'
    and person.is_active
    and (
      me_role <> 'student'
      or person.linked_student_id is null
      or person.linked_student_id = auth.uid()
    )
  order by person.display_name;
end;
$$;

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
  select person.role, person.team_id
    into target_role, target_team
  from public.profiles person
  where person.id = target_user
    and person.approval_status = 'approved'
    and person.is_active;

  if target_team is distinct from public.current_team_id()
     or (target_user <> auth.uid() and public.current_profile_role() <> 'coach') then
    raise exception 'relationship access denied';
  end if;

  if target_role = 'parent' then
    return query
      select child.id, child.display_name, child.role
      from public.profiles parent
      join public.profiles child on child.id = parent.linked_student_id
      where parent.id = target_user
        and child.approval_status = 'approved'
        and child.is_active;
  elsif target_role = 'student' then
    return query
      select parent.id, parent.display_name, parent.role
      from public.profiles parent
      where parent.role = 'parent'
        and parent.linked_student_id = target_user
        and parent.approval_status = 'approved'
        and parent.is_active
      order by parent.display_name;
  end if;
end;
$$;

create or replace function public.set_parent_student(target_parent uuid, target_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role text := public.current_profile_role();
  current_student uuid;
begin
  if me_role <> 'coach'
     and target_parent <> auth.uid()
     and target_student is distinct from auth.uid() then
    raise exception 'relationship access denied';
  end if;

  if not exists (
    select 1 from public.profiles parent
    where parent.id = target_parent
      and parent.team_id = public.current_team_id()
      and parent.role = 'parent'
      and parent.approval_status = 'approved'
      and parent.is_active
  ) then
    raise exception 'approved parent not found';
  end if;

  select linked_student_id into current_student
  from public.profiles
  where id = target_parent;

  if me_role = 'student'
     and current_student is not null
     and current_student is distinct from target_student then
    raise exception 'this parent is already linked to another student';
  end if;

  if target_student is not null and not exists (
    select 1 from public.profiles student
    where student.id = target_student
      and student.team_id = public.current_team_id()
      and student.role = 'student'
      and student.approval_status = 'approved'
      and student.is_active
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
declare
  parent_ids uuid[] := coalesce(target_parents, array[]::uuid[]);
begin
  if public.current_profile_role() <> 'coach' and target_student <> auth.uid() then
    raise exception 'relationship access denied';
  end if;

  if not exists (
    select 1 from public.profiles student
    where student.id = target_student
      and student.team_id = public.current_team_id()
      and student.role = 'student'
      and student.approval_status = 'approved'
      and student.is_active
  ) then
    raise exception 'approved student not found';
  end if;

  if cardinality(parent_ids) > 2
     or cardinality(parent_ids) <> (select count(distinct value) from unnest(parent_ids) value) then
    raise exception 'select no more than two different parents';
  end if;

  if exists (
    select 1
    from unnest(parent_ids) parent_id
    where not exists (
      select 1 from public.profiles parent
      where parent.id = parent_id
        and parent.team_id = public.current_team_id()
        and parent.role = 'parent'
        and parent.approval_status = 'approved'
        and parent.is_active
    )
  ) then
    raise exception 'approved parent not found';
  end if;

  if public.current_profile_role() = 'student' and exists (
    select 1
    from public.profiles parent
    where parent.id = any(parent_ids)
      and parent.linked_student_id is not null
      and parent.linked_student_id <> target_student
  ) then
    raise exception 'a selected parent is already linked to another student';
  end if;

  update public.profiles
  set linked_student_id = null
  where role = 'parent'
    and linked_student_id = target_student
    and not (id = any(parent_ids));

  update public.profiles
  set linked_student_id = target_student
  where id = any(parent_ids);
end;
$$;

revoke all on function public.family_relationship_options(text) from public;
revoke all on function public.family_relationships(uuid) from public;
revoke all on function public.set_parent_student(uuid, uuid) from public;
revoke all on function public.set_student_parents(uuid, uuid[]) from public;
revoke execute on function public.family_relationship_options(text) from anon;
revoke execute on function public.family_relationships(uuid) from anon;
revoke execute on function public.set_parent_student(uuid, uuid) from anon;
revoke execute on function public.set_student_parents(uuid, uuid[]) from anon;
grant execute on function public.family_relationship_options(text) to authenticated;
grant execute on function public.family_relationships(uuid) to authenticated;
grant execute on function public.set_parent_student(uuid, uuid) to authenticated;
grant execute on function public.set_student_parents(uuid, uuid[]) to authenticated;

drop function if exists public.team_roster();
create function public.team_roster()
returns table(
  id uuid,
  display_name text,
  role text,
  team_title text,
  avatar_key text,
  photo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select person.id,
         person.display_name,
         person.role,
         person.team_title,
         details.avatar_key,
         details.photo_path
  from public.profiles person
  left join public.student_details details on details.student_id = person.id
  where person.team_id = public.current_team_id()
    and person.approval_status = 'approved'
    and person.is_active
    and person.role in ('student', 'coach')
  order by case person.role when 'coach' then 0 else 1 end, person.display_name;
$$;

revoke all on function public.team_roster() from public;
revoke execute on function public.team_roster() from anon;
grant execute on function public.team_roster() to authenticated;

drop function if exists public.team_student_profile(uuid);
create function public.team_student_profile(target uuid)
returns table(
  id uuid,
  display_name text,
  tag_name text,
  avatar_key text,
  photo_path text,
  favorite_hero text,
  favorite_movie text,
  favorite_show text,
  favorite_place text,
  favorite_lego text,
  learning_goal text,
  parent_names text
)
language sql
stable
security definer
set search_path = public
as $$
  select child.id,
         child.display_name,
         details.tag_name,
         details.avatar_key,
         details.photo_path,
         details.favorite_hero,
         details.favorite_movie,
         details.favorite_show,
         details.favorite_place,
         details.favorite_lego,
         details.learning_goal,
         string_agg(parent.display_name, ' & ' order by parent.display_name)
  from public.profiles child
  left join public.student_details details on details.student_id = child.id
  left join public.profiles parent on parent.linked_student_id = child.id
    and parent.role = 'parent'
    and parent.approval_status = 'approved'
    and parent.is_active
  where child.id = target
    and child.role = 'student'
    and child.approval_status = 'approved'
    and child.is_active
    and child.team_id = public.current_team_id()
    and public.current_profile_role() in ('student', 'parent', 'coach')
  group by child.id, child.display_name, details.tag_name, details.avatar_key,
           details.photo_path, details.favorite_hero, details.favorite_movie,
           details.favorite_show, details.favorite_place, details.favorite_lego,
           details.learning_goal;
$$;

revoke all on function public.team_student_profile(uuid) from public;
revoke execute on function public.team_student_profile(uuid) from anon;
grant execute on function public.team_student_profile(uuid) to authenticated;
