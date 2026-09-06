alter table public.core_values_quiz_cards
  add column if not exists category text not null default 'teamwork_move';

alter table public.core_values_quiz_cards
  drop constraint if exists core_values_quiz_cards_category_check;
alter table public.core_values_quiz_cards
  add constraint core_values_quiz_cards_category_check check (category in ('teamwork_move','kind_coach','value_detective','scenario_choice','celebrate'));

create table if not exists public.core_values_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.core_values_quiz_cards(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 700),
  created_at timestamptz not null default now()
);
alter table public.core_values_quiz_answers enable row level security;

drop policy if exists core_values_story_student_post on public.core_values_story_turns;
create policy core_values_story_member_post on public.core_values_story_turns
for insert with check (team_id = public.current_team_id() and author_id = auth.uid() and public.current_profile_role() in ('student','parent','coach','student_coach'));

drop policy if exists core_values_quiz_student_post on public.core_values_quiz_cards;
create policy core_values_quiz_member_post on public.core_values_quiz_cards
for insert with check (team_id = public.current_team_id() and author_id = auth.uid() and public.current_profile_role() in ('student','parent','coach','student_coach'));

create policy core_values_answer_team_read on public.core_values_quiz_answers
for select using (exists (select 1 from public.core_values_quiz_cards c where c.id = card_id and c.team_id = public.current_team_id()) and public.current_profile_role() in ('student','parent','coach','student_coach'));
create policy core_values_answer_member_post on public.core_values_quiz_answers
for insert with check (author_id = auth.uid() and public.current_profile_role() in ('student','parent','coach','student_coach') and exists (select 1 from public.core_values_quiz_cards c where c.id = card_id and c.team_id = public.current_team_id()));
create policy core_values_answer_coach_delete on public.core_values_quiz_answers
for delete using (public.current_profile_role() in ('coach','student_coach') and exists (select 1 from public.core_values_quiz_cards c where c.id = card_id and c.team_id = public.current_team_id()));
