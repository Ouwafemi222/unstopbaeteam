-- Area note for awards the super admin picks by hand.
-- Run this once in the Supabase SQL editor.

alter table public.incentive_scores
  add column if not exists note text;
