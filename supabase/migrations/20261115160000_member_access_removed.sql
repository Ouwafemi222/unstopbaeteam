-- Super admin can remove a team member's access and restore it later.
-- Run this once in the Supabase SQL editor.

alter table public.team_members
  add column if not exists access_removed_at timestamptz,
  add column if not exists access_removed_by uuid;

create index if not exists team_members_access_removed_at_idx
  on public.team_members (access_removed_at)
  where access_removed_at is not null;
