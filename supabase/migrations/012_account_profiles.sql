create table if not exists public.account_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  photo_path text check (length(photo_path) <= 300),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id)
);

alter table public.account_details enable row level security;

drop policy if exists account_details_read_own on public.account_details;
drop policy if exists account_details_add_own on public.account_details;
drop policy if exists account_details_update_own on public.account_details;

create policy account_details_read_own on public.account_details
  for select to authenticated
  using (profile_id = auth.uid());

create policy account_details_add_own on public.account_details
  for insert to authenticated
  with check (profile_id = auth.uid() and updated_by = auth.uid());

create policy account_details_update_own on public.account_details
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and updated_by = auth.uid());

create or replace function public.update_my_display_name(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(new_name, ''))) not between 2 and 80 then
    raise exception 'display name must be between 2 and 80 characters';
  end if;

  update public.profiles
  set display_name = trim(new_name)
  where id = auth.uid()
    and approval_status = 'approved'
    and is_active;

  if not found then
    raise exception 'approved active profile required';
  end if;
end;
$$;

revoke all on function public.update_my_display_name(text) from public;
grant execute on function public.update_my_display_name(text) to authenticated;

-- A linked child belongs only on a parent account. Clean up any older values
-- before enforcing that rule at the database boundary.
update public.profiles set linked_student_id = null where role <> 'parent' and linked_student_id is not null;
alter table public.profiles drop constraint if exists profiles_parent_linked_child;
alter table public.profiles add constraint profiles_parent_linked_child
  check (role = 'parent' or linked_student_id is null);

create or replace function public.set_parent_student(target_parent uuid, target_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() <> 'coach' then
    raise exception 'coach administrator required';
  end if;

  if not exists (
    select 1 from public.profiles parent
    where parent.id = target_parent
      and parent.team_id = public.current_team_id()
      and parent.role = 'parent'
      and parent.approval_status = 'approved'
      and parent.is_active
  ) then
    raise exception 'approved parent not found';
  end if;

  if target_student is not null and not exists (
    select 1 from public.profiles student
    where student.id = target_student
      and student.team_id = public.current_team_id()
      and student.role = 'student'
      and student.approval_status = 'approved'
      and student.is_active
  ) then
    raise exception 'approved student not found';
  end if;

  update public.profiles
  set linked_student_id = target_student
  where id = target_parent;
end;
$$;

revoke all on function public.set_parent_student(uuid, uuid) from public;
grant execute on function public.set_parent_student(uuid, uuid) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('account-photos', 'account-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists account_photo_read_own on storage.objects;
drop policy if exists account_photo_add_own on storage.objects;
drop policy if exists account_photo_update_own on storage.objects;
drop policy if exists account_photo_delete_own on storage.objects;

create policy account_photo_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'account-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy account_photo_add_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'account-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy account_photo_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'account-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'account-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy account_photo_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'account-photos' and (storage.foldername(name))[1] = auth.uid()::text);
