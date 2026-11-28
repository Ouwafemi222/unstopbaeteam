-- Remember an account's status while it sits in Reserved for an unavailable member.
-- Run this once in the Supabase SQL editor.

alter table public.fiverr_accounts
  add column if not exists held_status text;
