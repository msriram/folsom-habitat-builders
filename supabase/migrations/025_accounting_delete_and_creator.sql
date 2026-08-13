-- Approved parents and coaches may remove ledger entries within their team.
drop policy if exists accounting_delete_parent_coach on public.accounting_entries;
create policy accounting_delete_parent_coach on public.accounting_entries
  for delete using (
    team_id = public.current_team_id()
    and public.current_profile_role() in ('parent','coach')
  );
