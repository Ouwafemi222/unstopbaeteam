-- What OCR read from a message screenshot, so an admin can confirm it.
-- Run this once in the Supabase SQL editor.

alter table public.messages
  add column if not exists ocr_text text,
  add column if not exists ocr_date text,
  add column if not exists ocr_time text,
  add column if not exists ocr_buyer text,
  add column if not exists ocr_gig text;
