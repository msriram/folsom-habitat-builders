-- Optional payer name shown in the shared ledger.
alter table public.accounting_entries
  add column if not exists paid_by text;

comment on column public.accounting_entries.paid_by is
  'Optional parent/team payer label; never store card or bank details.';
