-- A session can be closed even when time runs out.  The unfinished checklist
-- work stays visible in that session's record and is copied into the next
-- session so it does not disappear from the team's plan.
alter table public.schedule_sessions
  add column if not exists completed boolean not null default false,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.profiles(id);

create or replace function public.complete_schedule_session(target_session text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  active_team uuid;
  current_session public.schedule_sessions%rowtype;
  next_session public.schedule_sessions%rowtype;
  carried_count integer := 0;
begin
  if public.current_profile_role() not in ('coach','student_coach') then
    raise exception 'coach access required';
  end if;

  active_team := public.current_team_id();
  select * into current_session
  from public.schedule_sessions
  where team_id = active_team and session_key = target_session
  for update;

  if not found then
    raise exception 'session not found';
  end if;
  if current_session.completed then
    return jsonb_build_object('completed', true, 'already_completed', true, 'carried_count', 0);
  end if;

  select * into next_session
  from public.schedule_sessions
  where team_id = active_team and session_date > current_session.session_date
  order by session_date
  limit 1;

  if found then
    with unfinished as (
      select item.*, row_number() over (order by item.sort_order, item.id) as carry_order
      from public.schedule_items item
      where item.team_id = active_team
        and item.session_key = target_session
        and not item.completed
    ), inserted as (
      insert into public.schedule_items (team_id, session_key, week_number, area, label, sort_order)
      select active_team,
             next_session.session_key,
             coalesce((select min(existing.week_number) from public.schedule_items existing where existing.team_id = active_team and existing.session_key = next_session.session_key), unfinished.week_number),
             unfinished.area,
             'Carry-over: ' || unfinished.label,
             coalesce((select max(existing.sort_order) from public.schedule_items existing where existing.team_id = active_team and existing.session_key = next_session.session_key), 0) + unfinished.carry_order
      from unfinished
      on conflict (team_id, session_key, sort_order) do nothing
      returning id
    ) select count(*) into carried_count from inserted;
  end if;

  update public.schedule_sessions
  set completed = true, completed_at = now(), completed_by = auth.uid()
  where id = current_session.id;

  return jsonb_build_object(
    'completed', true,
    'already_completed', false,
    'carried_count', carried_count,
    'next_session_key', case when next_session.id is null then null else next_session.session_key end
  );
end;
$$;

revoke all on function public.complete_schedule_session(text) from public;
grant execute on function public.complete_schedule_session(text) to authenticated;
