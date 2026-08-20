-- Week 2 is a published team-name and cause assignment. Preserve its agreed
-- questions exactly; do not replace it with later robot/session planning.
do $$
declare
  target_assignment_id uuid;
begin
  select id into target_assignment_id
  from public.assignments
  where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f' and week_number = 2;
  update public.assignments
  set title = 'Choose a team name and a cause anchor',
      description = 'Connect our biodiversity interests to a team name, a cause, and one question we can investigate together.',
      due_at = '2026-08-19 23:59:00-07',
      published = true
  where id = target_assignment_id;
  delete from public.assignment_questions where assignment_id = target_assignment_id;
  insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required) values
    (target_assignment_id,'team_name',1,'What team name are you proposing?','text',true),
    (target_assignment_id,'cause',2,'What biodiversity cause should this name help us investigate?','long_text',true),
    (target_assignment_id,'reason',3,'Why does this name fit our interests and BIOGLOW?','long_text',true),
    (target_assignment_id,'next_step',4,'What should the team investigate or build next?','long_text',true);
end $$;
