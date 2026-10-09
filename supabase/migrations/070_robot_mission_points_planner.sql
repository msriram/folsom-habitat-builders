-- Individual scoring portions let the team compare a full mission with a
-- smaller, more reliable target. Coaches maintain the plan; all approved team
-- members can read it alongside the Robot Records run log.
create table if not exists public.robot_mission_point_targets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  mission text not null check (length(trim(mission)) between 1 and 80),
  portion text not null check (length(trim(portion)) between 1 and 180),
  points integer not null check (points >= 0),
  is_bonus boolean not null default false,
  condition_note text not null default '' check (length(condition_note) <= 240),
  targeted boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists robot_mission_point_targets_team_mission_idx
  on public.robot_mission_point_targets(team_id, mission, created_at);

alter table public.robot_mission_point_targets enable row level security;

drop policy if exists robot_mission_points_team_read on public.robot_mission_point_targets;
create policy robot_mission_points_team_read on public.robot_mission_point_targets for select using (
  team_id = public.current_team_id() and public.current_profile_role() in ('student','coach','student_coach','parent')
);

drop policy if exists robot_mission_points_team_add on public.robot_mission_point_targets;
create policy robot_mission_points_team_add on public.robot_mission_point_targets for insert with check (
  team_id = public.current_team_id() and author_id = auth.uid() and public.current_profile_role() in ('coach','student_coach')
);

drop policy if exists robot_mission_points_team_update on public.robot_mission_point_targets;
create policy robot_mission_points_team_update on public.robot_mission_point_targets for update using (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
) with check (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
);

drop policy if exists robot_mission_points_team_delete on public.robot_mission_point_targets;
create policy robot_mission_points_team_delete on public.robot_mission_point_targets for delete using (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
);
