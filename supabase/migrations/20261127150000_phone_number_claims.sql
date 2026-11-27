-- Remember which team member took a public number.
-- Run this once in the Supabase SQL editor.

create table if not exists public.phone_number_claims (
  number text primary key,
  team_member_id uuid references public.team_members(id) on delete cascade,
  user_id uuid not null,
  member_name text not null,
  catalog_added text not null,
  used_at timestamptz not null default now()
);

alter table public.phone_number_claims enable row level security;

drop policy if exists "members read phone claims" on public.phone_number_claims;
create policy "members read phone claims"
on public.phone_number_claims
for select
to authenticated
using (true);

drop policy if exists "members claim a phone number" on public.phone_number_claims;
create policy "members claim a phone number"
on public.phone_number_claims
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "members update own phone claim" on public.phone_number_claims;
create policy "members update own phone claim"
on public.phone_number_claims
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "members clear a phone claim" on public.phone_number_claims;
create policy "members clear a phone claim"
on public.phone_number_claims
for delete
to authenticated
using (
  user_id = auth.uid()
  or used_at < now() - interval '24 hours'
);
