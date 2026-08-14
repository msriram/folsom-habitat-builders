-- Private receipt/attachment storage for accounting entries.
insert into storage.buckets (id,name,public)
values ('team-receipts','team-receipts',false)
on conflict (id) do update set public=false;

drop policy if exists accounting_receipt_read on storage.objects;
create policy accounting_receipt_read on storage.objects for select to authenticated using (
  bucket_id='team-receipts' and public.current_profile_role() in ('parent','coach')
  and exists (select 1 from public.accounting_entries e where e.receipt_path=name and e.team_id=public.current_team_id())
);
drop policy if exists accounting_receipt_add on storage.objects;
create policy accounting_receipt_add on storage.objects for insert to authenticated with check (
  bucket_id='team-receipts' and public.current_profile_role() in ('parent','coach')
  and (storage.foldername(name))[1]=public.current_team_id()::text
);
drop policy if exists accounting_receipt_remove on storage.objects;
create policy accounting_receipt_remove on storage.objects for delete to authenticated using (
  bucket_id='team-receipts' and public.current_profile_role() in ('parent','coach')
  and (storage.foldername(name))[1]=public.current_team_id()::text
);
