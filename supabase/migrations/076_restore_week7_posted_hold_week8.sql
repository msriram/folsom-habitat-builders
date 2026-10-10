-- Week 7 was already posted to the team. Keep it available as an existing
-- assignment (so coaches can resend it as a reminder) and hold the new Week 8
-- three-part plan until the coach intentionally posts it.
update public.assignments
set published = case week_number
  when 7 then true
  when 8 then false
  else published
end
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and week_number in (7, 8);
