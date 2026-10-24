-- Keep coach review and HTML homework reminders aligned with the website.
-- Preserve existing answer keys, submissions, dates and publication status.
begin;
update public.assignment_questions q
set prompt = 'Prepare for the November 1 afternoon conservation sale. Read our tamarin website and study the bridge CAD on the Innovation Project page. Explain how isolated trees affect tamarins and how our bridge with intermediate pylons might help. Choose one concrete contribution: make a bridge prop, draft one presentation slide, prepare a sign, or plan cookies with your family (quantity, ingredients and price). Describe what you will bring. Propose one fair tabletop test and two questions for Save the Golden Lion Tamarin about existing crossings, materials or help they need. The coach coordinates the first email; record whether contact is planned, sent or answered.'
from public.assignments a
where q.assignment_id = a.id
  and a.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number = 8 and q.question_key = 'golden_tamarin_solution';
update public.assignment_questions q
set prompt = 'Prepare for the November 1 afternoon conservation sale. Read our tamarin website and study the bridge CAD on the Innovation Project page. Explain how isolated trees affect tamarins and how our bridge with intermediate pylons might help. Choose one concrete contribution: make a bridge prop, draft one presentation slide, prepare a sign, or plan cookies with your family (quantity, ingredients and price). Describe what you will bring. Propose one fair tabletop test and two questions for Save the Golden Lion Tamarin about existing crossings, materials or help they need. The coach coordinates the first email; record whether contact is planned, sent or answered.'
from public.assignments a
where q.assignment_id = a.id
  and a.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number = 10 and q.question_key = 'project_impact_plan';

update public.assignment_questions q
set prompt = 'Report on the November 1 sale: what did you contribute and what did visitors ask? Record the team-confirmed sales income, costs and amount available to donate, or say which totals are still being checked. State whether the coach has sent the donation and obtained a receipt; do not guess. Describe one bridge test using span, sag, load or link fit and one improvement it suggests. Draft your slide using a photo or result. What did the nonprofit reply, or what follow-up should the coach send? Suggest a factual update for our tamarin website.'
from public.assignments a
where q.assignment_id = a.id
  and a.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number = 11 and q.question_key = 'project_story';

update public.assignment_questions q
set prompt = 'Rehearse our tamarin Innovation Project explanation using the bridge prop and slides: problem, existing crossings, our proposed bridge and pylons, test evidence, expert feedback and revisions. Explain why tabletop PLA results do not prove a full-scale crossing is ready. Describe your speaking part and one judge question to practice. Include verified sale and donation results, nonprofit communication and the next help we can offer. If feedback or a receipt is still pending, say so. What should our conservation website publish next?'
from public.assignments a
where q.assignment_id = a.id
  and a.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number = 12 and q.question_key = 'project_rehearsal';
commit;
