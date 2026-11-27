-- A number counts as used only after a text with a code arrives.
-- Run this once in the Supabase SQL editor.

alter table public.phone_number_claims
  add column if not exists code text;

delete from public.phone_number_claims
where code is null or btrim(code) = '';
