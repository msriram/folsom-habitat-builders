-- Coach-only attendance and individual session review records. These records
-- are retained with the session and are not exposed to other team accounts.
create table if not exists public.session_student_reviews (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  session_key text not null check (length(session_key) between 1 and 40),
  student_id uuid not null references public.profiles(id) on delete cascade,
  attendance text not null default 'present' check (attendance in ('present','absent')),
  work_completed text not null default '' check (length(work_completed) <= 4000),
  went_well text not null default '' check (length(went_well) <= 4000),
  next_improvement text not null default '' check (length(next_improvement) <= 4000),
  reviewed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, session_key, student_id)
);

alter table public.session_student_reviews enable row level security;

drop policy if exists session_student_reviews_coach_read on public.session_student_reviews;
create policy session_student_reviews_coach_read on public.session_student_reviews
for select using (
  team_id = public.current_team_id()
  and public.current_profile_role() in ('coach','student_coach')
);

drop policy if exists session_student_reviews_coach_add on public.session_student_reviews;
create policy session_student_reviews_coach_add on public.session_student_reviews
for insert with check (
  team_id = public.current_team_id()
  and reviewed_by = auth.uid()
  and public.current_profile_role() in ('coach','student_coach')
);

drop policy if exists session_student_reviews_coach_update on public.session_student_reviews;
create policy session_student_reviews_coach_update on public.session_student_reviews
for update using (
  team_id = public.current_team_id()
  and public.current_profile_role() in ('coach','student_coach')
) with check (
  team_id = public.current_team_id()
  and reviewed_by = auth.uid()
  and public.current_profile_role() in ('coach','student_coach')
);
