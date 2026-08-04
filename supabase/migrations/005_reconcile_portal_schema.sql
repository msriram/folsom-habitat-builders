-- Reconcile partially applied 003/004 migrations without deleting user data.
alter table profiles add column if not exists team_title text check(length(team_title)<=100);
alter table student_details add column if not exists avatar_key text;
alter table student_details add column if not exists photo_path text check(length(photo_path)<=300);

create or replace function public.can_manage_student(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles me join profiles child on child.id=target and child.team_id=me.team_id where me.id=auth.uid() and me.approval_status='approved' and me.is_active and (me.id=target or me.role='coach' or (me.role='parent' and me.linked_student_id=target)))
$$;
create or replace function public.current_linked_student_id() returns uuid language sql stable security definer set search_path=public as $$
  select linked_student_id from profiles where id=auth.uid() and role='parent' and approval_status='approved' and is_active
$$;
create or replace function public.update_student_display_name(target uuid,new_name text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not can_manage_student(target) or length(trim(new_name)) not between 1 and 80 then raise exception 'not allowed'; end if;
  update profiles set display_name=trim(new_name) where id=target and role='student';
end $$;
create or replace function public.team_roster() returns table(id uuid,display_name text,role text,team_title text) language sql security definer set search_path=public as $$
  select p.id,p.display_name,p.role,p.team_title from profiles p where p.team_id=current_team_id() and p.approval_status='approved' and p.is_active and p.role in ('student','coach') order by case p.role when 'coach' then 0 else 1 end,p.display_name
$$;
create or replace function public.tshirt_order() returns table(display_name text,tshirt_size text) language sql security definer set search_path=public as $$
  select p.display_name,d.tshirt_size from profiles p left join student_details d on d.student_id=p.id where p.team_id=current_team_id() and p.role='student' and p.approval_status='approved' and current_profile_role()='coach' order by p.display_name
$$;

drop policy if exists student_details_read on student_details;
drop policy if exists student_details_add on student_details;
drop policy if exists student_details_update on student_details;
create policy student_details_read on student_details for select using(can_manage_student(student_id));
create policy student_details_add on student_details for insert with check(can_manage_student(student_id) and updated_by=auth.uid());
create policy student_details_update on student_details for update using(can_manage_student(student_id)) with check(can_manage_student(student_id) and updated_by=auth.uid());

drop policy if exists submission_read_by_owner_family_coach on submissions;
drop policy if exists submission_add_by_student on submissions;
drop policy if exists submission_update_by_coach on submissions;
create policy submission_read_by_owner_family_coach on submissions for select using(student_id=auth.uid() or student_id=current_linked_student_id() or (current_profile_role()='coach' and exists(select 1 from assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id())));
create policy submission_add_by_student on submissions for insert with check(student_id=auth.uid() and current_profile_role()='student' and exists(select 1 from assignments a where a.id=assignment_id and a.team_id=current_team_id()));
create policy submission_update_by_coach on submissions for update using(current_profile_role()='coach' and exists(select 1 from assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id())) with check(current_profile_role()='coach' and exists(select 1 from assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id()));

drop policy if exists question_team_read on questions;
drop policy if exists question_read_by_role on questions;
drop policy if exists question_update_by_coach on questions;
create policy question_read_by_role on questions for select using(visibility='public' or (team_id=current_team_id() and current_profile_role()='coach') or (team_id=current_team_id() and current_profile_role()='student' and visibility='team') or author_id=current_linked_student_id() or author_id=auth.uid());
create policy question_update_by_coach on questions for update using(team_id=current_team_id() and current_profile_role()='coach') with check(team_id=current_team_id() and current_profile_role()='coach');

drop policy if exists coding_project_read_by_role on coding_projects;
drop policy if exists coding_project_add_by_student on coding_projects;
drop policy if exists coding_project_update_by_owner_or_coach on coding_projects;
drop policy if exists coding_version_read_via_project on coding_versions;
drop policy if exists coding_version_add_via_project on coding_versions;
create policy coding_project_read_by_role on coding_projects for select using(owner_id=auth.uid() or owner_id=current_linked_student_id() or (team_id=current_team_id() and current_profile_role()='coach') or (team_id=current_team_id() and current_profile_role()='student' and visibility='team'));
create policy coding_project_add_by_student on coding_projects for insert with check(owner_id=auth.uid() and team_id=current_team_id() and current_profile_role()='student');
create policy coding_project_update_by_owner_or_coach on coding_projects for update using(owner_id=auth.uid() or (team_id=current_team_id() and current_profile_role()='coach')) with check((owner_id=auth.uid() and team_id=current_team_id() and visibility in ('private','team')) or (team_id=current_team_id() and current_profile_role()='coach'));
create policy coding_version_read_via_project on coding_versions for select using(exists(select 1 from coding_projects p where p.id=project_id and (p.owner_id=auth.uid() or p.owner_id=current_linked_student_id() or (p.team_id=current_team_id() and current_profile_role()='coach') or (p.team_id=current_team_id() and current_profile_role()='student' and p.visibility='team'))));
create policy coding_version_add_via_project on coding_versions for insert with check(exists(select 1 from coding_projects p where p.id=project_id and (p.owner_id=auth.uid() or (p.team_id=current_team_id() and current_profile_role()='coach'))));

drop policy if exists robot_test_team_read on robot_tests;
drop policy if exists robot_test_read_by_role on robot_tests;
create policy robot_test_read_by_role on robot_tests for select using(author_id=auth.uid() or author_id=current_linked_student_id() or (team_id=current_team_id() and current_profile_role() in ('student','coach')));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-photos','profile-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists profile_photo_read on storage.objects;
drop policy if exists profile_photo_add on storage.objects;
drop policy if exists profile_photo_remove on storage.objects;
create policy profile_photo_read on storage.objects for select to authenticated using(bucket_id='profile-photos' and can_manage_student(((storage.foldername(name))[1])::uuid));
create policy profile_photo_add on storage.objects for insert to authenticated with check(bucket_id='profile-photos' and can_manage_student(((storage.foldername(name))[1])::uuid));
create policy profile_photo_remove on storage.objects for delete to authenticated using(bucket_id='profile-photos' and can_manage_student(((storage.foldername(name))[1])::uuid));

revoke all on function public.current_linked_student_id() from public;
revoke all on function public.team_roster() from public;
revoke all on function public.tshirt_order() from public;
revoke all on function public.update_student_display_name(uuid,text) from public;
grant execute on function public.current_linked_student_id() to authenticated;
grant execute on function public.team_roster() to authenticated;
grant execute on function public.tshirt_order() to authenticated;
grant execute on function public.update_student_display_name(uuid,text) to authenticated;
