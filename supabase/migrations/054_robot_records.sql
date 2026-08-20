-- Shared robot calibration and mission evidence. Keep these records append-only
-- so the team can compare setups and test results over the season.
create table if not exists public.robot_setup (
  team_id uuid primary key references public.teams(id) on delete cascade,
  table_length_mm numeric check (table_length_mm is null or table_length_mm > 0),
  table_width_mm numeric check (table_width_mm is null or table_width_mm > 0),
  robot_length_mm numeric check (robot_length_mm is null or robot_length_mm > 0),
  robot_width_mm numeric check (robot_width_mm is null or robot_width_mm > 0),
  robot_height_mm numeric check (robot_height_mm is null or robot_height_mm > 0),
  wheel_diameter_mm numeric check (wheel_diameter_mm is null or wheel_diameter_mm > 0),
  distance_per_motor_rotation_mm numeric check (distance_per_motor_rotation_mm is null or distance_per_motor_rotation_mm > 0),
  turn_90_motor_rotations numeric check (turn_90_motor_rotations is null or turn_90_motor_rotations > 0),
  drive_motor_ports text not null default '',
  gear_ratio text not null default '',
  launch_alignment_notes text not null default '',
  gyro_and_sensor_notes text not null default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.robot_calibration_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  test_kind text not null check (test_kind in ('straight_drive','turn','line_or_sensor','launch_alignment','attachment')),
  test_name text not null,
  target_value numeric,
  actual_value numeric,
  unit text not null default 'mm' check (unit in ('mm','degrees','seconds','rotations','other')),
  motor_rotations numeric,
  start_reference text not null default '',
  observation text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.robot_mission_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  mission text not null,
  attachment_name text not null default '',
  program_name text not null default '',
  launch_reference text not null default '',
  planned_points integer check (planned_points is null or planned_points >= 0),
  observed_points integer check (observed_points is null or observed_points >= 0),
  attempts integer not null default 1 check (attempts > 0),
  successes integer not null default 0 check (successes >= 0 and successes <= attempts),
  fastest_run_seconds numeric check (fastest_run_seconds is null or fastest_run_seconds >= 0),
  average_run_seconds numeric check (average_run_seconds is null or average_run_seconds >= 0),
  result_notes text not null default '',
  next_change text not null default '',
  created_at timestamptz not null default now()
);

alter table public.robot_setup enable row level security;
alter table public.robot_calibration_runs enable row level security;
alter table public.robot_mission_runs enable row level security;

create policy robot_setup_team_read on public.robot_setup for select using (
  team_id = public.current_team_id() and public.current_profile_role() in ('student','coach','student_coach','parent')
);
create policy robot_setup_team_insert on public.robot_setup for insert with check (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
);
create policy robot_setup_team_update on public.robot_setup for update using (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
) with check (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
);

create policy robot_calibration_team_read on public.robot_calibration_runs for select using (
  team_id = public.current_team_id() and public.current_profile_role() in ('student','coach','student_coach','parent')
);
create policy robot_calibration_team_add on public.robot_calibration_runs for insert with check (
  team_id = public.current_team_id() and author_id = auth.uid() and public.current_profile_role() in ('coach','student_coach')
);

create policy robot_mission_team_read on public.robot_mission_runs for select using (
  team_id = public.current_team_id() and public.current_profile_role() in ('student','coach','student_coach','parent')
);
create policy robot_mission_team_add on public.robot_mission_runs for insert with check (
  team_id = public.current_team_id() and author_id = auth.uid() and public.current_profile_role() in ('coach','student_coach')
);
