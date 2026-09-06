create table if not exists public.core_values_story_turns (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.current_team_id() references public.teams(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 700),
  created_at timestamptz not null default now()
);

create table if not exists public.core_values_quiz_cards (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.current_team_id() references public.teams(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 1 and 240),
  answer text not null check (char_length(trim(answer)) between 1 and 700),
  created_at timestamptz not null default now()
);

alter table public.core_values_story_turns enable row level security;
alter table public.core_values_quiz_cards enable row level security;

create policy core_values_story_team_read on public.core_values_story_turns
for select using (team_id = public.current_team_id() and public.current_profile_role() in ('student','parent','coach','student_coach'));
create policy core_values_story_student_post on public.core_values_story_turns
for insert with check (team_id = public.current_team_id() and author_id = auth.uid() and public.current_profile_role() in ('student','coach','student_coach'));
create policy core_values_story_coach_delete on public.core_values_story_turns
for delete using (team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach'));

create policy core_values_quiz_team_read on public.core_values_quiz_cards
for select using (team_id = public.current_team_id() and public.current_profile_role() in ('student','parent','coach','student_coach'));
create policy core_values_quiz_student_post on public.core_values_quiz_cards
for insert with check (team_id = public.current_team_id() and author_id = auth.uid() and public.current_profile_role() in ('student','coach','student_coach'));
create policy core_values_quiz_coach_delete on public.core_values_quiz_cards
for delete using (team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach'));
