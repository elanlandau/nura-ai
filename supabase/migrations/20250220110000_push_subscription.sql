-- Web Push (Pop): store push subscriptions so Nura can notify when tab is closed.
-- Run in Supabase SQL Editor or via Supabase CLI.

create table if not exists public.push_subscription (
  id text primary key,
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscription_user_id_idx on public.push_subscription(user_id);
