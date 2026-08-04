-- Approval, accounting, and reusable persistence policies.
create or replace function public.current_profile_role() returns text language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() and approval_status='approved' and is_active $$;
create or replace function public.current_team_id() returns uuid language sql stable security definer set search_path=public as $$ select team_id from profiles where id=auth.uid() and approval_status='approved' and is_active $$;

alter table profiles add column if not exists email text;
create policy profile_self_read on profiles for select using (id=auth.uid());
create policy profile_coach_team_read on profiles for select using (team_id=current_team_id() and current_profile_role()='coach');

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,display_name,email,approval_status)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name','New user'),new.email,'pending')
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.pending_users() returns table(id uuid,email text,display_name text,approval_status text)
language sql security definer set search_path=public as $$
  select p.id,p.email,p.display_name,p.approval_status from profiles p
  where p.approval_status='pending' and current_profile_role()='coach' order by p.display_name
$$;
create or replace function public.approve_user(target_id uuid,target_role text,target_team uuid,target_student uuid default null) returns void
language plpgsql security definer set search_path=public as $$
begin
  if current_profile_role()<>'coach' then raise exception 'coach access required'; end if;
  if target_role not in ('student','parent','coach') then raise exception 'invalid role'; end if;
  if target_team is distinct from current_team_id() then raise exception 'invalid team'; end if;
  if target_role='parent' and target_student is not null and not exists(select 1 from profiles where id=target_student and team_id=current_team_id() and role='student' and approval_status='approved') then raise exception 'invalid linked student'; end if;
  update profiles set role=target_role,team_id=target_team,linked_student_id=case when target_role='parent' then target_student else null end,
    approval_status='approved',approved_by=auth.uid(),approved_at=now() where id=target_id and approval_status='pending';
end $$;
revoke all on function public.pending_users() from public; grant execute on function public.pending_users() to authenticated;
revoke all on function public.approve_user(uuid,text,uuid,uuid) from public; grant execute on function public.approve_user(uuid,text,uuid,uuid) to authenticated;

create table accounting_entries (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references teams(id),
  entry_date date not null, entry_type text not null check(entry_type in ('expense','contribution','reimbursement')),
  description text not null check(length(description)<=240), amount numeric(10,2) not null check(amount>0),
  notes text check(length(notes)<=1000), receipt_path text,
  created_by uuid not null references profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table accounting_entries enable row level security;
create policy accounting_read_parent_coach on accounting_entries for select using (team_id=current_team_id() and current_profile_role() in ('parent','coach'));
create policy accounting_add_parent_coach on accounting_entries for insert with check (team_id=current_team_id() and created_by=auth.uid() and current_profile_role() in ('parent','coach'));
create policy accounting_update_parent_coach on accounting_entries for update using (team_id=current_team_id() and current_profile_role() in ('parent','coach')) with check (team_id=current_team_id() and current_profile_role() in ('parent','coach'));

-- Approved team users can retrieve team assignments and questions. Submission
-- policies must additionally restrict students/parents to the linked student.
create policy assignment_team_read on assignments for select using (team_id=current_team_id());
create policy question_team_read on questions for select using (team_id=current_team_id() and (visibility='team' or visibility='public'));
create policy question_student_add on questions for insert with check (team_id=current_team_id() and author_id=auth.uid() and current_profile_role() in ('student','coach'));
create policy robot_test_team_read on robot_tests for select using (team_id=current_team_id());
create policy robot_test_add on robot_tests for insert with check (team_id=current_team_id() and author_id=auth.uid() and current_profile_role() in ('student','coach'));

-- Code, answers, and uploads are normalized into their domain tables:
-- coding_projects/coding_versions, questions, submissions, and robot_tests.
-- Create private Storage buckets named `team-submissions` and `team-receipts`;
-- add storage.objects policies only after testing each role with separate accounts.
