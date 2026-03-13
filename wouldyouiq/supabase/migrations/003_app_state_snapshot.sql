-- WouldYouIQ app snapshot sync
-- Stores the full local-first app snapshot per user for offline-friendly sync.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_state enable row level security;

create policy "Users can CRUD own app_state"
  on public.app_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
