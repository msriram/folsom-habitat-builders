-- Reopen every Week 5 submission for revision without discarding student
-- responses or uploads. The existing feedback remains visible to each student
-- as the reason for the revision request.
update public.submissions submission
set status = 'revise'
from public.assignments assignment
where submission.assignment_id = assignment.id
  and assignment.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and assignment.week_number = 5;

-- The work is no longer final, so hide any previously shared review roll-up
-- until the coach has reviewed the revised submissions again.
update public.assignments
set reviews_published = false,
    reviews_published_at = null,
    reviews_published_by = null
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and week_number = 5;
