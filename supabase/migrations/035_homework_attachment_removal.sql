-- Students can remove their own submitted file. A linked parent may remove a
-- file from that child's submission; no other family or team records are exposed.
drop policy if exists submission_files_remove_by_owner_or_parent on public.submission_files;
create policy submission_files_remove_by_owner_or_parent on public.submission_files
for delete using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_files.submission_id
      and (s.student_id = auth.uid() or s.student_id = current_linked_student_id())
  )
);

drop policy if exists homework_file_remove_by_owner_or_parent on storage.objects;
create policy homework_file_remove_by_owner_or_parent on storage.objects
for delete to authenticated using (
  bucket_id = 'homework-files'
  and (
    auth.uid() = ((storage.foldername(name))[1])::uuid
    or current_linked_student_id() = ((storage.foldername(name))[1])::uuid
  )
);
