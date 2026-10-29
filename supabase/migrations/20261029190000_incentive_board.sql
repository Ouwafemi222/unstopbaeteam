-- Prize for each incentive space, plus scores the super admin types by hand.
-- Run this once in the Supabase SQL editor after the incentives table exists.

alter table public.incentives
  add column if not exists slot text,
  add column if not exists prize text;

create unique index if not exists incentives_slot_key
  on public.incentives (slot)
  where slot is not null;

create table if not exists public.incentive_scores (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  year_month text not null,
  score numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (slot, team_member_id, year_month)
);

alter table public.incentive_scores enable row level security;

drop policy if exists incentive_scores_admin_all on public.incentive_scores;
create policy incentive_scores_admin_all
  on public.incentive_scores
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

grant select, insert, update, delete on public.incentive_scores to authenticated;
