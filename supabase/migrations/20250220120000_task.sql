-- Tasks for Task Pop: due date alerts.
create table if not exists public.task (
  id text primary key,
  user_id text not null,
  title text not null,
  due_at timestamptz not null,
  alert_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_user_id_idx on public.task(user_id);
create index if not exists task_due_at_idx on public.task(due_at);
create index if not exists task_alert_sent_at_idx on public.task(alert_sent_at);
