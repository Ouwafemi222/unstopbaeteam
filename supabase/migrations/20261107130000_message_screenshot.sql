-- Screenshot evidence for a recorded Fiverr message.
-- Run this once in the Supabase SQL editor.

alter table public.messages
  add column if not exists screenshot_path text;
