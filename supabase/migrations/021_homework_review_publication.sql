-- Coach-gated homework roll-ups. Individual submissions remain private until
-- every approved student has coach feedback and a coach explicitly publishes.
alter table public.assignments
  add column if not exists reviews_published boolean not null default false,
  add column if not exists reviews_published_at timestamptz,
  add column if not exists reviews_published_by uuid references public.profiles(id);

drop policy if exists submission_read_by_owner_family_coach on public.submissions;
create policy submission_read_by_owner_family_coach on public.submissions
for select using (
  student_id = auth.uid()
  or student_id = current_linked_student_id()
  or (
    current_profile_role() in ('coach','student_coach')
    and exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id and a.team_id = current_team_id()
    )
  )
);

drop policy if exists submission_update_by_coach on public.submissions;
create policy submission_update_by_coach on public.submissions
for update using (
  current_profile_role() in ('coach','student_coach')
  and exists (select 1 from public.assignments a where a.id = submissions.assignment_id and a.team_id = current_team_id())
) with check (
  current_profile_role() in ('coach','student_coach')
  and exists (select 1 from public.assignments a where a.id = submissions.assignment_id and a.team_id = current_team_id())
);

drop policy if exists submission_coach_add on public.submissions;
create policy submission_coach_add on public.submissions
for insert with check (
  current_profile_role() in ('coach','student_coach')
  and exists (
    select 1 from public.assignments a
    join public.profiles s on s.id = submissions.student_id
    where a.id = submissions.assignment_id
      and a.team_id = current_team_id()
      and s.team_id = a.team_id
      and s.role = 'student'
      and s.approval_status = 'approved'
      and s.is_active
  )
);

drop policy if exists submission_answers_read on public.submission_answers;
create policy submission_answers_read on public.submission_answers
for select using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    where s.id = submission_answers.submission_id
      and (
        s.student_id = auth.uid()
        or s.student_id = current_linked_student_id()
        or current_profile_role() in ('coach','student_coach')
        or (a.reviews_published and current_profile_role() in ('student','parent'))
      )
  )
);

drop policy if exists submission_answers_add on public.submission_answers;
create policy submission_answers_add on public.submission_answers
for insert with check (
  exists (
    select 1 from public.submissions s
    where s.id = submission_answers.submission_id
      and (s.student_id = auth.uid() or current_profile_role() in ('coach','student_coach'))
  )
);

drop policy if exists submission_answers_update on public.submission_answers;
create policy submission_answers_update on public.submission_answers
for update using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_answers.submission_id
      and (s.student_id = auth.uid() or current_profile_role() in ('coach','student_coach'))
  )
) with check (
  exists (
    select 1 from public.submissions s
    where s.id = submission_answers.submission_id
      and (s.student_id = auth.uid() or current_profile_role() in ('coach','student_coach'))
  )
);

drop policy if exists submission_files_read on public.submission_files;
create policy submission_files_read on public.submission_files
for select using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    where s.id = submission_files.submission_id
      and (
        s.student_id = auth.uid()
        or s.student_id = current_linked_student_id()
        or current_profile_role() in ('coach','student_coach')
        or (a.reviews_published and current_profile_role() in ('student','parent'))
      )
  )
);

create or replace function public.publish_homework_reviews(target_assignment uuid)
returns table(ready boolean, reviewed_students integer, total_students integer)
language plpgsql security definer set search_path=public as $$
declare
  assignment_team uuid;
  total_count integer;
  reviewed_count integer;
begin
  if current_profile_role() not in ('coach','student_coach') then
    raise exception 'coach access required';
  end if;

  select a.team_id into assignment_team
  from public.assignments a
  where a.id = target_assignment and a.published;

  if assignment_team is null or assignment_team is distinct from current_team_id() then
    raise exception 'assignment not found';
  end if;

  select count(*) into total_count
  from public.profiles p
  where p.team_id = assignment_team and p.role = 'student'
    and p.approval_status = 'approved' and p.is_active;

  select count(*) into reviewed_count
  from public.profiles p
  where p.team_id = assignment_team and p.role = 'student'
    and p.approval_status = 'approved' and p.is_active
    and exists (
      select 1 from public.submissions s
      where s.assignment_id = target_assignment and s.student_id = p.id
        and length(trim(coalesce(s.coach_feedback,''))) > 0
    );

  if total_count = 0 or reviewed_count < total_count then
    raise exception 'feedback is required for every approved student (% of % reviewed)', reviewed_count, total_count;
  end if;

  update public.assignments
  set reviews_published = true,
      reviews_published_at = now(),
      reviews_published_by = auth.uid()
  where id = target_assignment;

  return query select true, reviewed_count, total_count;
end;
$$;

create or replace function public.published_homework_reviews(target_assignment uuid)
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
  files jsonb
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
    answers.topic, answers.paragraph, answers.sources,
    s.coach_feedback, coalesce(s.status,'not_submitted'), s.submitted_at,
    coalesce(files.items, '[]'::jsonb)
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
  ) answers on true
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

drop policy if exists homework_file_read_published on storage.objects;
create policy homework_file_read_published on storage.objects
for select to authenticated using (
  bucket_id = 'homework-files'
  and current_profile_role() in ('student','parent','coach','student_coach')
  and exists (
    select 1
    from public.submission_files sf
    join public.submissions s on s.id = sf.submission_id
    join public.assignments a on a.id = s.assignment_id
    where sf.storage_path = storage.objects.name
      and a.team_id = current_team_id()
      and a.reviews_published
  )
);

revoke all on function public.publish_homework_reviews(uuid) from public;
grant execute on function public.publish_homework_reviews(uuid) to authenticated;
revoke all on function public.published_homework_reviews(uuid) from public;
grant execute on function public.published_homework_reviews(uuid) to authenticated;

drop function if exists public.admin_users();
create or replace function public.admin_users()
returns table(id uuid,email text,display_name text,role text,linked_student_id uuid,linked_student_name text,is_admin boolean)
language sql security definer set search_path=public as $$
  select p.id,p.email,p.display_name,p.role,p.linked_student_id,child.display_name,p.is_admin
  from public.profiles p
  left join public.profiles child on child.id=p.linked_student_id
  where public.current_profile_role() in ('coach','student_coach')
    and p.team_id=public.current_team_id() and p.approval_status='approved' and p.is_active
  order by case p.role when 'coach' then 0 when 'student_coach' then 1 when 'student' then 2 else 3 end,p.display_name;
$$;
revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated;

-- The opening-day deck is a team resource. Week 2 asks students to read it,
-- connect the three Week 0 interests, and submit a name plus a cause anchor.
insert into public.assignments(team_id,title,description,due_at,created_by,week_number,published)
select t.id,
  'Choose a team name and project direction',
  'Read the parent opening-day deck, propose a team name, and connect it to a biodiversity cause the team could investigate.',
  '2026-08-16 17:00:00-07',
  p.id, 2, true
from public.teams t
join public.profiles p on p.team_id = t.id and p.role = 'coach' and p.approval_status = 'approved'
where t.slug = 'folsom-fireflies'
order by p.approved_at
limit 1
on conflict (team_id,week_number) where week_number is not null do update
set title = excluded.title, description = excluded.description, due_at = excluded.due_at, published = true;

insert into public.assignment_questions(assignment_id,question_key,display_order,prompt,answer_type,required)
select a.id,q.key,q.ord,q.prompt,q.kind,q.required
from public.assignments a
cross join (values
  ('team_name',0,'What team name are you proposing?','text',true),
  ('cause',1,'What biodiversity cause should this name help us investigate?','long_text',true),
  ('reason',2,'Why does this name fit our interests and the BIOGLOW season?','long_text',true),
  ('next_step',3,'What should the team investigate or build next?','long_text',true)
) q(key,ord,prompt,kind,required)
where a.team_id = (select id from public.teams where slug = 'folsom-fireflies')
  and a.week_number = 2
on conflict (assignment_id,question_key) do update
set prompt = excluded.prompt, answer_type = excluded.answer_type, required = excluded.required;
