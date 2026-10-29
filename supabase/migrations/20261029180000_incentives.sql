-- Incentives the super admin sets. Members read the ones meant for them.
-- Run this once in the Supabase SQL editor.

create table if not exists public.incentives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  team_member_id uuid references public.team_members(id) on delete cascade,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incentives_active_idx
  on public.incentives (is_active, created_at desc);

alter table public.incentives enable row level security;

drop policy if exists incentives_admin_all on public.incentives;
create policy incentives_admin_all
  on public.incentives
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

drop policy if exists incentives_member_read on public.incentives;
create policy incentives_member_read
  on public.incentives
  for select
  to authenticated
  using (
    is_active
    and (
      team_member_id is null
      or team_member_id in (
        select id from public.team_members where user_id = auth.uid()
      )
    )
  );

grant select, insert, update, delete on public.incentives to authenticated;
