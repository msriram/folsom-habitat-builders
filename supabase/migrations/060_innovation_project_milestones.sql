-- A small, team-owned roadmap for the Innovation Project.  These milestones
-- deliberately describe the work rather than grading individual students.
create table if not exists public.innovation_project_milestones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  milestone_key text not null check (length(milestone_key) between 1 and 80),
  title text not null check (length(title) between 1 and 160),
  detail text not null default '',
  stage text not null check (stage in ('Foundation','Understand','Design','Test','Share')),
  sort_order integer not null,
  completed boolean not null default false,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  unique(team_id, milestone_key)
);

alter table public.innovation_project_milestones enable row level security;

create policy innovation_milestones_team_read on public.innovation_project_milestones for select using (
  team_id = public.current_team_id()
);

create policy innovation_milestones_coach_update on public.innovation_project_milestones for update using (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
) with check (
  team_id = public.current_team_id() and public.current_profile_role() in ('coach','student_coach')
);

insert into public.innovation_project_milestones (team_id, milestone_key, title, detail, stage, sort_order)
select teams.id, milestones.milestone_key, milestones.title, milestones.detail, milestones.stage, milestones.sort_order
from public.teams teams
cross join (values
  ('team_name','Team name and season theme','Connect Habitat Builders to the BIOGLOW season.', 'Foundation',1),
  ('project_lens','Biodiversity focus','Choose a broad habitat, species, or biodiversity concern worth exploring.', 'Foundation',2),
  ('problem','Specific problem statement','Name who or what is affected, what is happening, where, and why it matters.', 'Understand',3),
  ('local_context','Local context','Record why this problem matters in a real community or habitat.', 'Understand',4),
  ('research_sources','Reliable research','Collect and compare credible sources, observations, or data.', 'Understand',5),
  ('stakeholder','Expert or user perspective','Talk with, survey, or otherwise learn from someone close to the problem.', 'Understand',6),
  ('existing_solutions','Existing solutions','Document what people already do, what works, and what is still difficult.', 'Understand',7),
  ('project_question','Project question','Write the focused question the team is trying to answer.', 'Design',8),
  ('basic_idea','Basic idea','Describe the team’s first useful solution idea in plain language.', 'Design',9),
  ('idea_choice','Idea choice','Compare options and record why this is the best one to develop first.', 'Design',10),
  ('prototype','First prototype','Make a drawing, model, mock-up, experiment, guide, or process someone can react to.', 'Test',11),
  ('feedback','Feedback','Collect specific feedback from a relevant person or audience.', 'Test',12),
  ('revision','Revision','Change the idea because of evidence or feedback.', 'Test',13),
  ('impact_evidence','Impact evidence','Identify what would show that the solution can help.', 'Test',14),
  ('impact_plan','Impact plan','Plan how the team will share, test, or use the solution beyond the table.', 'Share',15),
  ('story','Presentation story','Prepare the clear story: problem, research, solution, impact, and what changed.', 'Share',16),
  ('practice','Practice and improve','Practice the presentation, gather feedback, and improve it.', 'Share',17)
) as milestones(milestone_key, title, detail, stage, sort_order)
on conflict (team_id, milestone_key) do update set
  title = excluded.title,
  detail = excluded.detail,
  stage = excluded.stage,
  sort_order = excluded.sort_order;
