-- Session dates, coach notes, and explicit publication state.
create table if not exists public.schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  session_key text not null,
  session_date date not null,
  coach_notes text not null default '',
  published boolean not null default false,
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(team_id, session_key)
);

alter table public.schedule_sessions enable row level security;

drop policy if exists schedule_sessions_read on public.schedule_sessions;
create policy schedule_sessions_read on public.schedule_sessions for select
  using (team_id = public.current_team_id()
    and (published or public.current_profile_role() in ('coach','student_coach')));

drop policy if exists schedule_sessions_coach_insert on public.schedule_sessions;
create policy schedule_sessions_coach_insert on public.schedule_sessions for insert
  with check (team_id = public.current_team_id()
    and public.current_profile_role() in ('coach','student_coach'));

drop policy if exists schedule_sessions_coach_update on public.schedule_sessions;
create policy schedule_sessions_coach_update on public.schedule_sessions for update
  using (team_id = public.current_team_id()
    and public.current_profile_role() in ('coach','student_coach'))
  with check (team_id = public.current_team_id()
    and public.current_profile_role() in ('coach','student_coach'));

insert into public.schedule_sessions(team_id, session_key, session_date)
select t.id, v.session_key, v.session_date::date
from public.teams t
cross join (values
  ('meeting-01','2026-08-14'),('meeting-02','2026-08-21'),
  ('meeting-03','2026-08-28'),('meeting-04','2026-09-04'),
  ('meeting-05','2026-09-11'),('meeting-06','2026-09-18'),
  ('meeting-07','2026-09-25'),('meeting-08','2026-10-02'),
  ('meeting-09','2026-10-09'),('meeting-10','2026-10-16'),
  ('meeting-11','2026-10-23'),('meeting-12','2026-10-30')
) v(session_key, session_date)
where t.slug='folsom-fireflies'
on conflict(team_id, session_key) do update set session_date=excluded.session_date;
