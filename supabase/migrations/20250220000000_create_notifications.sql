-- NURA Pulse: notifications table for background scan insights
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) or via Supabase CLI.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('meeting_request', 'urgent', 'insight')),
  title text not null,
  body text,
  reference_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

-- Users can only read and update their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications (e.g. mark read)"
  on public.notifications for update
  using (auth.uid() = user_id);

-- No insert policy for authenticated/anon: only service role (cron) can insert; service_role bypasses RLS
comment on table public.notifications is 'NURA Pulse: insights from background Gmail/workspace scan';
