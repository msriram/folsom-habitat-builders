update public.teams
set name = 'Habitat Builders'
where slug = 'folsom-fireflies'
  and name is distinct from 'Habitat Builders';
