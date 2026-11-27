-- Remember whether an order was paid on Fiverr or outside Fiverr.
-- Run this once in the Supabase SQL editor.

alter table public.orders_received
  add column if not exists payment_source text,
  add column if not exists gross_amount numeric,
  add column if not exists fee_amount numeric,
  add column if not exists fee_percent numeric;
