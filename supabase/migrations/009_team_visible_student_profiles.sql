alter table student_details add column if not exists tag_name text check(length(tag_name)<=40);

create or replace function public.team_student_profile(target uuid)
returns table(
  id uuid,
  display_name text,
  tag_name text,
  avatar_key text,
  favorite_hero text,
  favorite_movie text,
  favorite_show text,
  favorite_place text,
  favorite_lego text,
  learning_goal text,
  parent_names text
)
language sql
stable
security definer
set search_path=public
as $$
  select child.id,
         child.display_name,
         details.tag_name,
         details.avatar_key,
         details.favorite_hero,
         details.favorite_movie,
         details.favorite_show,
         details.favorite_place,
         details.favorite_lego,
         details.learning_goal,
         string_agg(parent.display_name, ' & ' order by parent.display_name)
  from profiles child
  left join student_details details on details.student_id=child.id
  left join profiles parent on parent.linked_student_id=child.id
    and parent.role='parent'
    and parent.approval_status='approved'
    and parent.is_active
  where child.id=target
    and child.role='student'
    and child.approval_status='approved'
    and child.is_active
    and child.team_id=current_team_id()
    and current_profile_role() in ('student','parent','coach')
  group by child.id,child.display_name,details.tag_name,details.avatar_key,
           details.favorite_hero,details.favorite_movie,details.favorite_show,
           details.favorite_place,details.favorite_lego,details.learning_goal
$$;

revoke all on function public.team_student_profile(uuid) from public;
revoke execute on function public.team_student_profile(uuid) from anon;
grant execute on function public.team_student_profile(uuid) to authenticated;
