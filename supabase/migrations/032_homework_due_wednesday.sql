-- Weekly homework closes Wednesday, leaving Thursday for coach review and publication.
update public.assignments
set due_at = due_at - interval '2 days'
where team_id = (select id from public.teams where slug = 'folsom-fireflies')
  and due_at is not null
  and extract(dow from due_at at time zone 'America/Los_Angeles') = 5;
