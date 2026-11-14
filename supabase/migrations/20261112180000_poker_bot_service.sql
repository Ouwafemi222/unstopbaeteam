-- Add Poker Bot so members can pick it when they record an account or a message.
-- Run this once in the Supabase SQL editor.

insert into public.services (name, slug, description, is_active)
select 'Poker Bot', 'poker-bot', 'Poker bot and poker analysis gigs', true
where not exists (
  select 1
  from public.services
  where slug = 'poker-bot' or lower(name) = 'poker bot'
);
