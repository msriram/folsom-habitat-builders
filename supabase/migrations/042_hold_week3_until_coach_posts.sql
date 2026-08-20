-- Week 3 is prepared for the coach, but is not visible to families until the
-- coach uses the normal selected-homework send button to post it.
update public.assignments
set published = false
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and week_number = 3;
