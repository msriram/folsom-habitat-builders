alter table profiles add column if not exists team_title text check(length(team_title)<=100);

create table student_details (
  student_id uuid primary key references profiles(id) on delete cascade,
  tshirt_size text check(tshirt_size in ('Youth XS','Youth S','Youth M','Youth L','Youth XL','Adult XS','Adult S','Adult M','Adult L','Adult XL','Adult 2XL') or tshirt_size is null),
  food_preference text check(length(food_preference)<=80), food_safety_note text check(length(food_safety_note)<=500),
  height_inches numeric(4,1) check(height_inches between 24 and 84), weight_pounds numeric(5,1) check(weight_pounds between 25 and 400),
  favorite_hero text check(length(favorite_hero)<=120), favorite_movie text check(length(favorite_movie)<=120),
  favorite_show text check(length(favorite_show)<=120), favorite_place text check(length(favorite_place)<=120),
  favorite_lego text check(length(favorite_lego)<=120), learning_goal text check(length(learning_goal)<=200),
  updated_by uuid not null references profiles(id), updated_at timestamptz not null default now()
);
alter table student_details enable row level security;

create or replace function public.can_manage_student(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles me join profiles child on child.id=target and child.team_id=me.team_id
    where me.id=auth.uid() and me.approval_status='approved' and me.is_active and
    (me.id=target or me.role='coach' or (me.role='parent' and me.linked_student_id=target)))
$$;
create policy student_details_read on student_details for select using(can_manage_student(student_id));
create policy student_details_add on student_details for insert with check(can_manage_student(student_id) and updated_by=auth.uid());
create policy student_details_update on student_details for update using(can_manage_student(student_id)) with check(can_manage_student(student_id) and updated_by=auth.uid());
create or replace function public.update_student_display_name(target uuid,new_name text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not can_manage_student(target) or length(trim(new_name)) not between 1 and 80 then raise exception 'not allowed'; end if;
  update profiles set display_name=trim(new_name) where id=target and role='student';
end $$;
revoke all on function public.update_student_display_name(uuid,text) from public; grant execute on function public.update_student_display_name(uuid,text) to authenticated;

create or replace function public.team_roster() returns table(id uuid,display_name text,role text,team_title text)
language sql security definer set search_path=public as $$
  select p.id,p.display_name,p.role,p.team_title from profiles p
  where p.team_id=current_team_id() and p.approval_status='approved' and p.is_active and p.role in ('student','coach')
  order by case p.role when 'coach' then 0 else 1 end,p.display_name
$$;
revoke all on function public.team_roster() from public; grant execute on function public.team_roster() to authenticated;

create or replace function public.tshirt_order() returns table(display_name text,tshirt_size text)
language sql security definer set search_path=public as $$
  select p.display_name,d.tshirt_size from profiles p left join student_details d on d.student_id=p.id
  where p.team_id=current_team_id() and p.role='student' and p.approval_status='approved' and current_profile_role()='coach'
  order by p.display_name
$$;
revoke all on function public.tshirt_order() from public; grant execute on function public.tshirt_order() to authenticated;

-- Enter the supplied roster only through the private Supabase dashboard or an
-- authenticated admin import. Never place child/parent names in this public repo.
