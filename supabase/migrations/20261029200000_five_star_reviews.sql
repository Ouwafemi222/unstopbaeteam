-- Evidence of a Fiverr 5-star review, recorded by the member who received it.
-- Run this once in the Supabase SQL editor.

create table if not exists public.five_star_reviews (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  received_date date not null,
  buyer_name text,
  gig_name text,
  note text,
  screenshot_path text not null,
  recorded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists five_star_reviews_member_date_idx
  on public.five_star_reviews (team_member_id, received_date desc);

alter table public.five_star_reviews enable row level security;

drop policy if exists five_star_reviews_admin_all on public.five_star_reviews;
create policy five_star_reviews_admin_all
  on public.five_star_reviews
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

drop policy if exists five_star_reviews_member_read on public.five_star_reviews;
create policy five_star_reviews_member_read
  on public.five_star_reviews
  for select
  to authenticated
  using (
    team_member_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists five_star_reviews_member_insert on public.five_star_reviews;
create policy five_star_reviews_member_insert
  on public.five_star_reviews
  for insert
  to authenticated
  with check (
    team_member_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.five_star_reviews to authenticated;
