-- Profile: store avatar and email; sync from auth on insert and update
-- Run in Supabase SQL Editor after 001_initial_schema.sql

-- Add columns for auth-synced user info
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists email text;

-- Create profile on signup with name, avatar, email from auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      ''
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Update profile when auth user is updated (e.g. name/avatar change in provider)
create or replace function public.handle_user_updated()
returns trigger as $$
begin
  update public.profiles
  set
    name = coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      profiles.name
    ),
    avatar_url = coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      profiles.avatar_url
    ),
    email = coalesce(new.email, profiles.email),
    updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_updated();
