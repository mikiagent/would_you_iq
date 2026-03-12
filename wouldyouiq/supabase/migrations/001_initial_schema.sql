-- WouldYouIQ: profiles, tasks, budget tables with RLS
-- Run this in Supabase SQL Editor or via Supabase CLI.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default '',
  xp int default 0,
  streak int default 0,
  streak_last_date date,
  comparisons_total int default 0,
  tasks_completed int default 0,
  monthly_income numeric default 0,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Tasks (id is app-generated string for easy sync)
create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '📋',
  name text not null,
  time_estimate text default '',
  elo int default 1200,
  essential boolean default false,
  deadline text check (deadline in ('today', 'this week')),
  urgency text not null default 'low' check (urgency in ('high', 'med', 'low')),
  done boolean default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users can CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index tasks_user_id_idx on public.tasks(user_id);

-- Budget income (one row per user)
create table if not exists public.budget_income (
  user_id uuid primary key references auth.users(id) on delete cascade,
  amount numeric not null default 0,
  updated_at timestamptz default now()
);

alter table public.budget_income enable row level security;

create policy "Users can CRUD own budget_income"
  on public.budget_income for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Budget items (id is app-generated string for easy sync)
create table if not exists public.budget_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '💰',
  name text not null,
  amount_monthly numeric not null default 0,
  type text not null default 'flex' check (type in ('essential', 'flex')),
  essential boolean default false,
  elo int default 1200,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.budget_items enable row level security;

create policy "Users can CRUD own budget_items"
  on public.budget_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index budget_items_user_id_idx on public.budget_items(user_id);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
