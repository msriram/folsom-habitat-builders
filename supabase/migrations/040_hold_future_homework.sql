-- Future assignments stay in the coach workspace until explicitly published.
update public.assignments
set published = false
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and week_number between 4 and 12;
