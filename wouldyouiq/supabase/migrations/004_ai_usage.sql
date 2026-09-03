-- Per-user daily AI usage counters, written only by edge functions
-- (service role). RLS is enabled with no policies so clients cannot
-- read or write rows directly.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
