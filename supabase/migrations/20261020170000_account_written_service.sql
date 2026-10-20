-- The service a Fiverr account was opened for.
-- Run this once in the Supabase SQL editor.

alter table public.fiverr_accounts
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists written_service text;

create index if not exists fiverr_accounts_service_id_idx
  on public.fiverr_accounts (service_id);
