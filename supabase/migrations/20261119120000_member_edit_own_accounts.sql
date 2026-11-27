-- Let a team member update the Fiverr accounts they recorded.
-- Run this once in the Supabase SQL editor.

alter table public.fiverr_accounts enable row level security;

drop policy if exists "members update own fiverr accounts" on public.fiverr_accounts;

create policy "members update own fiverr accounts"
on public.fiverr_accounts
for update
to authenticated
using (
  team_member_id in (
    select id from public.team_members where user_id = auth.uid()
  )
)
with check (
  team_member_id in (
    select id from public.team_members where user_id = auth.uid()
  )
);
