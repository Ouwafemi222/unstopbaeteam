-- Email records: every team member can log an email, super admin can see them all.
-- Run this once in the Supabase SQL editor if the table is not there yet.

create table if not exists public.email_records (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  received_date date not null,
  received_time time,
  sender_name text,
  sender_email text,
  subject text not null,
  notes text,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_records_member_date_idx
  on public.email_records (team_member_id, received_date desc);

alter table public.email_records enable row level security;

drop policy if exists email_records_admin_all on public.email_records;
create policy email_records_admin_all
  on public.email_records
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

drop policy if exists email_records_member_read on public.email_records;
create policy email_records_member_read
  on public.email_records
  for select
  to authenticated
  using (
    team_member_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists email_records_member_insert on public.email_records;
create policy email_records_member_insert
  on public.email_records
  for insert
  to authenticated
  with check (
    team_member_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists email_records_member_update on public.email_records;
create policy email_records_member_update
  on public.email_records
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

grant select, insert, update, delete on public.email_records to authenticated;
