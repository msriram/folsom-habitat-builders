-- Private CS2N programming homework, with one screenshot, reflection, and coach mark per week.
create table if not exists public.robot_homework_tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 12),
  phase text not null check (phase in ('required','optional')),
  title text not null, description text not null, cs2n_url text not null,
  hints text[] not null default '{}', unique(team_id, week_number)
);
create table if not exists public.robot_homework_submissions (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.robot_homework_tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade, reflection text not null default '', screenshot_path text,
  screenshot_file_name text, score numeric check (score between 0 and 10), coach_feedback text, submitted_at timestamptz,
  updated_at timestamptz not null default now(), unique(task_id, student_id)
);
alter table public.robot_homework_tasks enable row level security;
alter table public.robot_homework_submissions enable row level security;
create policy robot_homework_tasks_read on public.robot_homework_tasks for select using (team_id = current_team_id());
create policy robot_homework_submissions_read on public.robot_homework_submissions for select using (
  student_id = auth.uid() or student_id = current_linked_student_id()
  or (current_profile_role() in ('coach','student_coach') and exists (select 1 from public.robot_homework_tasks t where t.id = task_id and t.team_id = current_team_id()))
);
create policy robot_homework_submissions_coach_update on public.robot_homework_submissions for update using (
  current_profile_role() in ('coach','student_coach') and exists (select 1 from public.robot_homework_tasks t where t.id = task_id and t.team_id = current_team_id())
) with check (
  current_profile_role() in ('coach','student_coach') and exists (select 1 from public.robot_homework_tasks t where t.id = task_id and t.team_id = current_team_id())
);
create or replace function public.submit_robot_homework(target_task uuid, response_reflection text, image_path text, image_name text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if current_profile_role() <> 'student' then raise exception 'student access required'; end if;
  if length(trim(coalesce(response_reflection,''))) < 20 then raise exception 'write a few lines about how the program worked'; end if;
  if image_path !~ ('^' || auth.uid()::text || '/') then raise exception 'invalid screenshot path'; end if;
  if not exists (select 1 from public.robot_homework_tasks where id=target_task and team_id=current_team_id()) then raise exception 'task not found'; end if;
  insert into public.robot_homework_submissions(task_id,student_id,reflection,screenshot_path,screenshot_file_name,submitted_at,updated_at)
  values(target_task,auth.uid(),trim(response_reflection),image_path,image_name,now(),now())
  on conflict(task_id,student_id) do update set reflection=excluded.reflection,screenshot_path=excluded.screenshot_path,screenshot_file_name=excluded.screenshot_file_name,submitted_at=excluded.submitted_at,updated_at=now();
end $$;
revoke all on function public.submit_robot_homework(uuid,text,text,text) from public;
grant execute on function public.submit_robot_homework(uuid,text,text,text) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('robot-homework','robot-homework',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy robot_homework_image_add on storage.objects for insert to authenticated with check (bucket_id = 'robot-homework' and (storage.foldername(name))[1] = auth.uid()::text);
create policy robot_homework_image_read on storage.objects for select to authenticated using (
  bucket_id = 'robot-homework' and exists (
    select 1 from public.robot_homework_submissions s join public.robot_homework_tasks t on t.id = s.task_id
    where s.screenshot_path = storage.objects.name and t.team_id = current_team_id()
      and (s.student_id = auth.uid() or s.student_id = current_linked_student_id() or current_profile_role() in ('coach','student_coach'))
  )
);

insert into public.robot_homework_tasks(team_id,week_number,phase,title,description,cs2n_url,hints)
select t.id, v.week, v.phase, v.title, v.description, v.url, v.hints from public.teams t cross join (values
  (1,'required','Iris Rover: moving forward','Start with Introduction: Iris Rover, then complete Moving Forward. Submit a screenshot of your finished program.','https://www.cs2n.org/u/mp/badge_pages/2991',array['Use a short, clear sequence first.','Change one movement value, then run it again.']),
  (2,'required','Sequential movements','Complete Proportional Relationships and Sequential Movements.','https://www.cs2n.org/u/mp/badge_pages/2994',array['Estimate before you run the robot.','Use the same units for each movement.']),
  (3,'required','Turning in place','Complete Turning in Place and Turn Around the Craters.','https://www.cs2n.org/u/mp/badge_pages/2996',array['Test one turn at a time.','Notice which motor direction makes the robot rotate.']),
  (4,'required','Swing turns and steering','Complete Swing Turns and Steer Around the Crater.','https://www.cs2n.org/u/mp/badge_pages/2999',array['Compare a swing turn with a turn in place.','Write down what changed in the path.']),
  (5,'required','Sensors: wait until near','Complete Wait Until Near and Move Until Near.','https://www.cs2n.org/u/mp/badge_pages/3014',array['A sensor waits for a condition before the next action.','Test with the object at two different distances.']),
  (6,'required','Sensors: color and touch','Complete Wait for Green, Move Until Red, and Move Until Pressed.','https://www.cs2n.org/u/mp/badge_pages/3019',array['Describe exactly what the sensor noticed.','Use one condition at a time while debugging.']),
  (7,'required','Loops','Complete Forever Loops, Repeat Loops, and Repeat Until.','https://www.cs2n.org/u/mp/badge_pages/3027',array['Choose the loop that matches how many repeats you need.','Make a prediction before changing a loop.']),
  (8,'required','Discrete decisions','Complete Turn If Not Clear, Move If Clear, and Looped Decisions.','https://www.cs2n.org/u/mp/badge_pages/3038',array['An if-statement chooses based on a condition.','Try both possible paths in your explanation.']),
  (9,'optional','Optional: nested decisions','Try Nested Decisions and Investigating the Landslide.','https://www.cs2n.org/u/mp/badge_pages/3046',array['Build and test the outside decision first.','Then add the inside choice.']),
  (10,'optional','Optional: subterranean challenge','Explore the Subterranean Challenge overview and one Phase 1 activity.','https://www.cs2n.org/u/mp/badge_pages/3050',array['Break the challenge into small actions.','Test one phase before joining them together.']),
  (11,'optional','Optional: obstacle detection','Try Obstacle Detection and Cobot Assist.','https://www.cs2n.org/u/mp/badge_pages/3058',array['State what the robot senses and what it does next.','Keep the behavior simple and repeatable.']),
  (12,'optional','Optional: line tracking','Try Line Tracking or the Obstacle Line Tracking challenge.','https://www.cs2n.org/u/mp/badge_pages/3060',array['Make one adjustment at a time.','Record the best setting you found.'])
) v(week,phase,title,description,url,hints) where t.slug = 'folsom-fireflies'
on conflict (team_id,week_number) do update set phase=excluded.phase,title=excluded.title,description=excluded.description,cs2n_url=excluded.cs2n_url,hints=excluded.hints;
