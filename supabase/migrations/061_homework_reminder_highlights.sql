-- A coach-controlled note that appears above the standard homework email.
-- The assignment description and question list remain the canonical homework
-- notice; this field is intentionally only a short, optional emphasis block.
alter table public.assignments
  add column if not exists reminder_highlight text;

create or replace function public.set_assignment_reminder_highlight(
  target_week integer,
  new_highlight text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_highlight text;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'coach'
      and p.approval_status = 'approved'
      and p.is_active
      and (coalesce(p.is_admin, false) or lower(coalesce(p.email, '')) = 'sriram87@gmail.com')
  ) then
    raise exception 'coach administrator access required';
  end if;

  cleaned_highlight := nullif(trim(coalesce(new_highlight, '')), '');
  if length(coalesce(cleaned_highlight, '')) > 4000 then
    raise exception 'weekly highlight must be 4000 characters or fewer';
  end if;

  update public.assignments
  set reminder_highlight = cleaned_highlight
  where team_id = current_team_id()
    and week_number = target_week;

  if not found then
    raise exception 'homework week % was not found for this team', target_week;
  end if;
end;
$$;

revoke all on function public.set_assignment_reminder_highlight(integer, text) from public;
grant execute on function public.set_assignment_reminder_highlight(integer, text) to authenticated;

update public.assignments
set reminder_highlight = E'Watch the official FLL Robot Game Missions video or the 6006 Tech Warriors example for the model you built. Describe the attachment you want to build to approach that model.\nUse Ask AI or another AI tool to research the organism or model you worked with (for example, a leafcutter ant or katydid). Explain what it is and why it matters.\nIn 1–2 sentences, connect the biodiversity topic that interests you—such as invasive species, habitat destruction, rainforest life, or climate and biodiversity—to our team name, Habitat Builders.'
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and week_number = 3;
