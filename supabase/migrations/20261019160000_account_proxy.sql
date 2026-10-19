-- Proxy details saved with each Fiverr account.
-- Run this once in the Supabase SQL editor.

alter table public.fiverr_accounts
  add column if not exists proxy_host text,
  add column if not exists proxy_port text,
  add column if not exists proxy_username text,
  add column if not exists proxy_code text;
