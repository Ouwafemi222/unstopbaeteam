-- Weekly evaluation: super admin publishes a sheet, members submit, admin compares
-- answers with what each person actually recorded that week.
-- Run this once in the Supabase SQL editor if the tables are not there yet.

create table if not exists public.weekly_evaluation_rounds (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  title text not null,
  status text not null default 'published' check (status in ('published', 'closed')),
  published_by uuid,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_evaluation_topics (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.weekly_evaluation_rounds(id) on delete cascade,
  position integer not null,
  tally_key text,
  title text not null,
  prompt text not null,
  kind text not null check (kind in ('count', 'amount', 'text')),
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_evaluation_submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.weekly_evaluation_rounds(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  review_date date not null,
  notes text,
  submitted_at timestamptz not null default now(),
  unique (round_id, team_member_id)
);

create table if not exists public.weekly_evaluation_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.weekly_evaluation_submissions(id) on delete cascade,
  topic_id uuid not null references public.weekly_evaluation_topics(id) on delete cascade,
  value_text text,
  value_number numeric,
  unique (submission_id, topic_id)
);

create index if not exists weekly_evaluation_topics_round_idx
  on public.weekly_evaluation_topics (round_id, position);

create index if not exists weekly_evaluation_submissions_round_idx
  on public.weekly_evaluation_submissions (round_id);

alter table public.weekly_evaluation_rounds enable row level security;
alter table public.weekly_evaluation_topics enable row level security;
alter table public.weekly_evaluation_submissions enable row level security;
alter table public.weekly_evaluation_answers enable row level security;

drop policy if exists weekly_eval_rounds_admin_all on public.weekly_evaluation_rounds;
create policy weekly_eval_rounds_admin_all
  on public.weekly_evaluation_rounds
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

drop policy if exists weekly_eval_rounds_member_read on public.weekly_evaluation_rounds;
create policy weekly_eval_rounds_member_read
  on public.weekly_evaluation_rounds
  for select
  to authenticated
  using (status = 'published');

drop policy if exists weekly_eval_topics_admin_all on public.weekly_evaluation_topics;
create policy weekly_eval_topics_admin_all
  on public.weekly_evaluation_topics
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

drop policy if exists weekly_eval_topics_member_read on public.weekly_evaluation_topics;
create policy weekly_eval_topics_member_read
  on public.weekly_evaluation_topics
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.weekly_evaluation_rounds r
      where r.id = round_id
        and r.status = 'published'
    )
  );

drop policy if exists weekly_eval_submissions_admin_all on public.weekly_evaluation_submissions;
create policy weekly_eval_submissions_admin_all
  on public.weekly_evaluation_submissions
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

drop policy if exists weekly_eval_submissions_member_read on public.weekly_evaluation_submissions;
create policy weekly_eval_submissions_member_read
  on public.weekly_evaluation_submissions
  for select
  to authenticated
  using (
    team_member_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists weekly_eval_submissions_member_insert on public.weekly_evaluation_submissions;
create policy weekly_eval_submissions_member_insert
  on public.weekly_evaluation_submissions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.team_members tm
      join public.weekly_evaluation_rounds r on r.id = round_id
      where tm.id = team_member_id
        and tm.user_id = auth.uid()
        and r.status = 'published'
    )
  );

drop policy if exists weekly_eval_submissions_member_delete on public.weekly_evaluation_submissions;
create policy weekly_eval_submissions_member_delete
  on public.weekly_evaluation_submissions
  for delete
  to authenticated
  using (
    team_member_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists weekly_eval_answers_admin_all on public.weekly_evaluation_answers;
create policy weekly_eval_answers_admin_all
  on public.weekly_evaluation_answers
  for all
  to authenticated
  using (coalesce(public.is_super_admin(), false))
  with check (coalesce(public.is_super_admin(), false));

drop policy if exists weekly_eval_answers_member_read on public.weekly_evaluation_answers;
create policy weekly_eval_answers_member_read
  on public.weekly_evaluation_answers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.weekly_evaluation_submissions s
      join public.team_members tm on tm.id = s.team_member_id
      where s.id = submission_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists weekly_eval_answers_member_insert on public.weekly_evaluation_answers;
create policy weekly_eval_answers_member_insert
  on public.weekly_evaluation_answers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.weekly_evaluation_submissions s
      join public.team_members tm on tm.id = s.team_member_id
      where s.id = submission_id
        and tm.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.weekly_evaluation_rounds to authenticated;
grant select, insert, update, delete on public.weekly_evaluation_topics to authenticated;
grant select, insert, update, delete on public.weekly_evaluation_submissions to authenticated;
grant select, insert, update, delete on public.weekly_evaluation_answers to authenticated;
