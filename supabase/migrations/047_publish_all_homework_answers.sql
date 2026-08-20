-- Published review pages must work for every assignment, not only Week 0's
-- topic / paragraph / sources fields. Return the stored prompt and answer for
-- every response in display order.
drop function if exists public.published_homework_reviews(uuid);
create function public.published_homework_reviews(target_assignment uuid)
returns table(
  assignment_id uuid,
  assignment_title text,
  student_id uuid,
  display_name text,
  topic text,
  paragraph text,
  sources text,
  coach_feedback text,
  status text,
  submitted_at timestamptz,
  files jsonb,
  answers jsonb
)
language plpgsql security definer set search_path=public as $$
declare
  assignment_team uuid;
begin
  select a.team_id into assignment_team
  from public.assignments a
  where a.id = target_assignment and a.published and a.reviews_published;

  if assignment_team is null or assignment_team is distinct from current_team_id() then
    raise exception 'published homework review not found';
  end if;
  if current_profile_role() not in ('student','parent','coach','student_coach') then
    raise exception 'approved team access required';
  end if;

  return query
  select a.id, a.title, p.id, p.display_name,
    legacy.topic, legacy.paragraph, legacy.sources,
    s.coach_feedback, coalesce(s.status,'not_submitted'), s.submitted_at,
    coalesce(files.items, '[]'::jsonb),
    coalesce(responses.items, '[]'::jsonb)
  from public.assignments a
  join public.profiles p on p.team_id = a.team_id and p.role = 'student'
    and p.approval_status = 'approved' and p.is_active
  left join public.submissions s on s.assignment_id = a.id and s.student_id = p.id
  left join lateral (
    select
      max(sa.answer_text) filter (where sa.question_key = 'topic') as topic,
      max(sa.answer_text) filter (where sa.question_key = 'paragraph') as paragraph,
      max(sa.answer_text) filter (where sa.question_key = 'sources') as sources
    from public.submission_answers sa
    where sa.submission_id = s.id
  ) legacy on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'question_key', sa.question_key,
      'prompt', coalesce(q.prompt, sa.question_key),
      'answer_text', sa.answer_text,
      'answer_json', sa.answer_json,
      'display_order', sa.display_order
    ) order by sa.display_order) as items
    from public.submission_answers sa
    left join public.assignment_questions q
      on q.assignment_id = a.id and q.question_key = sa.question_key
    where sa.submission_id = s.id
  ) responses on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'file_name', sf.file_name,
      'storage_path', sf.storage_path,
      'mime_type', sf.mime_type
    ) order by sf.created_at) as items
    from public.submission_files sf
    where sf.submission_id = s.id
  ) files on true
  where a.id = target_assignment
  order by p.display_name;
end;
$$;

revoke all on function public.published_homework_reviews(uuid) from public;
grant execute on function public.published_homework_reviews(uuid) to authenticated;
