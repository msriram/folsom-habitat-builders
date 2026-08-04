create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  session_key text not null check(length(session_key) between 1 and 40),
  week_number integer not null check(week_number >= 0),
  area text not null check(area in ('Robot','Project','Teamwork','Presentation')),
  label text not null check(length(label) between 1 and 240),
  sort_order integer not null default 0,
  completed boolean not null default false,
  completed_by uuid references profiles(id),
  completed_at timestamptz,
  unique(team_id,session_key,sort_order)
);

alter table schedule_items enable row level security;
create policy schedule_items_team_read on schedule_items for select
  using(team_id=current_team_id());
create policy schedule_items_coach_update on schedule_items for update
  using(team_id=current_team_id() and current_profile_role()='coach')
  with check(team_id=current_team_id() and current_profile_role()='coach');

insert into schedule_items(team_id,session_key,week_number,area,label,sort_order)
select t.id,v.session_key,v.week_number,v.area,v.label,v.sort_order
from teams t cross join (values
  ('meeting-01',1,'Teamwork','Every student understands the main game rules',1),
  ('meeting-01',1,'Robot','Mission models are inspected and ready',2),
  ('meeting-01',1,'Teamwork','Open questions are visible to the team',3),
  ('meeting-01',1,'Robot','Both crews have a first experiment',4),
  ('meeting-02',1,'Project','At least five biodiversity ideas were considered',1),
  ('meeting-02',1,'Project','Research sources were recorded',2),
  ('meeting-02',1,'Project','Existing solutions were compared',3),
  ('meeting-02',1,'Teamwork','Next research questions have owners',4),
  ('meeting-03',2,'Robot','Matched wheels and firm axles were checked',1),
  ('meeting-03',2,'Robot','The starting jig was used for every trial',2),
  ('meeting-03',2,'Robot','All ten outcomes were recorded',3),
  ('meeting-03',2,'Teamwork','The team agreed on the next change',4),
  ('meeting-04',2,'Project','Evidence supports the selected problem',1),
  ('meeting-04',2,'Project','Assumptions are clearly labeled',2),
  ('meeting-04',2,'Project','One improvement can be tested',3),
  ('meeting-04',2,'Teamwork','Decisions and owners were recorded',4)
) v(session_key,week_number,area,label,sort_order)
where t.slug='folsom-fireflies'
on conflict(team_id,session_key,sort_order) do update
set week_number=excluded.week_number,area=excluded.area,label=excluded.label;

