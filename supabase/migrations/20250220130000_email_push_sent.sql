-- Gmail Alerts: track which emails we already sent a push for (no duplicate notifications).
create table if not exists public.email_push_sent (
  id text primary key,
  user_id text not null,
  message_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, message_id)
);

create index if not exists email_push_sent_user_id_idx on public.email_push_sent(user_id);
