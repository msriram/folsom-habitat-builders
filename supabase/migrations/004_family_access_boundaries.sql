-- Enforce family boundaries for student work.
-- Coaches can access all team records; parents only their linked child; students
-- their own private work plus explicitly team-visible collaboration records.

create or replace function public.current_linked_student_id() returns uuid
language sql stable security definer set search_path=public as $$
  select linked_student_id from profiles
  where id=auth.uid() and role='parent' and approval_status='approved' and is_active
$$;

-- Homework submissions and coach feedback.
create policy submission_read_by_owner_family_coach on submissions for select using (
  student_id=auth.uid()
  or student_id=current_linked_student_id()
  or (current_profile_role()='coach' and exists (
    select 1 from assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id()
  ))
);
create policy submission_add_by_student on submissions for insert with check (
  student_id=auth.uid() and current_profile_role()='student'
  and exists (select 1 from assignments a where a.id=assignment_id and a.team_id=current_team_id())
);
create policy submission_update_by_coach on submissions for update using (
  current_profile_role()='coach' and exists (
    select 1 from assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id()
  )
) with check (
  current_profile_role()='coach' and exists (
    select 1 from assignments a where a.id=submissions.assignment_id and a.team_id=current_team_id()
  )
);

-- Questions: students can collaborate on team-visible questions; parents only
-- see questions authored by their linked child; coaches see the whole team.
drop policy if exists question_team_read on questions;
create policy question_read_by_role on questions for select using (
  visibility='public'
  or (team_id=current_team_id() and current_profile_role()='coach')
  or (team_id=current_team_id() and current_profile_role()='student' and visibility='team')
  or (author_id=current_linked_student_id())
  or author_id=auth.uid()
);
create policy question_update_by_coach on questions for update using (
  team_id=current_team_id() and current_profile_role()='coach'
) with check (
  team_id=current_team_id() and current_profile_role()='coach'
);

-- Coding projects and versions.
create policy coding_project_read_by_role on coding_projects for select using (
  owner_id=auth.uid()
  or owner_id=current_linked_student_id()
  or (team_id=current_team_id() and current_profile_role()='coach')
  or (team_id=current_team_id() and current_profile_role()='student' and visibility='team')
);
create policy coding_project_add_by_student on coding_projects for insert with check (
  owner_id=auth.uid() and team_id=current_team_id() and current_profile_role()='student'
);
create policy coding_project_update_by_owner_or_coach on coding_projects for update using (
  owner_id=auth.uid() or (team_id=current_team_id() and current_profile_role()='coach')
) with check (
  (owner_id=auth.uid() and team_id=current_team_id() and visibility in ('private','team'))
  or (team_id=current_team_id() and current_profile_role()='coach')
);
create policy coding_version_read_via_project on coding_versions for select using (
  exists (select 1 from coding_projects p where p.id=project_id and (
    p.owner_id=auth.uid() or p.owner_id=current_linked_student_id()
    or (p.team_id=current_team_id() and current_profile_role()='coach')
    or (p.team_id=current_team_id() and current_profile_role()='student' and p.visibility='team')
  ))
);
create policy coding_version_add_via_project on coding_versions for insert with check (
  exists (select 1 from coding_projects p where p.id=project_id and (
    p.owner_id=auth.uid() or (p.team_id=current_team_id() and current_profile_role()='coach')
  ))
);

-- Robot tests follow the same family boundary for parents while students retain
-- team collaboration visibility.
drop policy if exists robot_test_team_read on robot_tests;
create policy robot_test_read_by_role on robot_tests for select using (
  author_id=auth.uid()
  or author_id=current_linked_student_id()
  or (team_id=current_team_id() and current_profile_role() in ('student','coach'))
);

revoke all on function public.current_linked_student_id() from public;
grant execute on function public.current_linked_student_id() to authenticated;
