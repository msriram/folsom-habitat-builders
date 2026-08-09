-- Student coaches can review work and offer team suggestions like assistant
-- coaches, but are never family accounts and cannot hold admin authority.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','parent','coach','student_coach'));

create or replace function public.approve_user(target_id uuid,target_role text,target_team uuid,target_student uuid,target_admin boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.current_profile_is_admin() then raise exception 'administrator access required'; end if;
  if target_role not in ('student','parent','coach','student_coach') then raise exception 'invalid role'; end if;
  if target_team is distinct from public.current_team_id() then raise exception 'invalid team'; end if;
  if target_student is not null and target_role in ('parent','coach') and not exists(select 1 from public.profiles where id=target_student and team_id=current_team_id() and role='student' and approval_status='approved' and is_active) then raise exception 'invalid linked student'; end if;
  update public.profiles set role=target_role,team_id=target_team,linked_student_id=case when target_role in ('parent','coach') then target_student else null end,is_admin=(target_role='coach' and target_admin),team_title=case when target_role='student_coach' then 'Student coach' else team_title end,approval_status='approved',approved_by=auth.uid(),approved_at=now(),is_active=true where id=target_id and approval_status='pending';
end; $$;

create or replace function public.approve_user(target_id uuid,target_role text,target_team uuid,target_student uuid default null)
returns void language plpgsql security definer set search_path=public as $$ begin perform public.approve_user(target_id,target_role,target_team,target_student,false); end; $$;

create or replace function public.can_manage_student(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles me join public.profiles child on child.id=target and child.team_id=me.team_id where me.id=auth.uid() and me.approval_status='approved' and me.is_active and (me.id=target or me.role in ('coach','student_coach') or (me.role='parent' and me.linked_student_id=target)))
$$;

create or replace function public.team_roster() returns table(id uuid,display_name text,role text,team_title text) language sql security definer set search_path=public as $$
  select p.id,p.display_name,p.role,p.team_title from public.profiles p where p.team_id=current_team_id() and p.approval_status='approved' and p.is_active and p.role in ('student','coach','student_coach') order by case p.role when 'coach' then 0 when 'student_coach' then 1 else 2 end,p.display_name
$$;

create or replace function public.admin_users()
returns table(id uuid,email text,display_name text,role text,linked_student_id uuid,linked_student_name text,is_admin boolean)
language sql security definer set search_path=public as $$
  select p.id,p.email,p.display_name,p.role,p.linked_student_id,child.display_name,p.is_admin from public.profiles p left join public.profiles child on child.id=p.linked_student_id where public.current_profile_role() in ('coach','student_coach') and p.team_id=current_team_id() and p.approval_status='approved' and p.is_active order by case p.role when 'coach' then 0 when 'student_coach' then 1 when 'student' then 2 else 3 end,p.display_name
$$;

drop policy if exists submission_read_by_owner_family_coach on public.submissions;
drop policy if exists submission_update_by_coach on public.submissions;
create policy submission_read_by_owner_family_coach on public.submissions for select using(student_id=auth.uid() or student_id=current_linked_student_id() or (current_profile_role() in ('coach','student_coach') and exists(select 1 from public.assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id())));
create policy submission_update_by_coach on public.submissions for update using(current_profile_role() in ('coach','student_coach') and exists(select 1 from public.assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id())) with check(current_profile_role() in ('coach','student_coach') and exists(select 1 from public.assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id()));
drop policy if exists submission_answers_add on public.submission_answers; drop policy if exists submission_answers_update on public.submission_answers;
create policy submission_answers_add on public.submission_answers for insert with check(exists(select 1 from public.submissions s where s.id=submission_id and (s.student_id=auth.uid() or current_profile_role() in ('coach','student_coach'))));
create policy submission_answers_update on public.submission_answers for update using(exists(select 1 from public.submissions s where s.id=submission_id and (s.student_id=auth.uid() or current_profile_role() in ('coach','student_coach')))) with check(exists(select 1 from public.submissions s where s.id=submission_id and (s.student_id=auth.uid() or current_profile_role() in ('coach','student_coach'))));

drop policy if exists schedule_items_coach_update on public.schedule_items;
create policy schedule_items_coach_update on public.schedule_items for update using(team_id=current_team_id() and current_profile_role() in ('coach','student_coach')) with check(team_id=current_team_id() and current_profile_role() in ('coach','student_coach'));
