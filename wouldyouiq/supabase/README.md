# Supabase setup for WouldYouIQ

Run the migrations in order in the **Supabase Dashboard → SQL Editor** (or via `supabase db push` if using Supabase CLI).

## What to run

1. **First time / fresh project**: Run both files in order.
   - `migrations/001_initial_schema.sql` — profiles, tasks, budget tables + RLS + trigger to create profile on signup.
   - `migrations/002_profile_auth_sync.sql` — adds `avatar_url` and `email` to profiles and syncs them from Auth on insert/update.

2. **You already ran 001**: Run only `migrations/002_profile_auth_sync.sql`.

## Summary of SQL

| File | Purpose |
|------|--------|
| **001** | Creates `profiles`, `tasks`, `budget_income`, `budget_items`; RLS so users only see their own data; trigger so new auth users get a profile row. |
| **002** | Adds `profiles.avatar_url` and `profiles.email`; updates triggers so new users get name/avatar/email from Google (or other provider), and profile is updated when auth user is updated. |

## Data flow

- **Sign up**: Auth insert → trigger creates a row in `profiles` with name, avatar_url, email from the provider.
- **Sign in**: App hydrates from Supabase, then merges auth user (name, avatar, email) into the local profile and pushes once so Supabase has the latest user info.
- **Ongoing**: App pushes profile, tasks, and budget data to Supabase after changes (debounced).

All app data (profile, tasks, budget) is stored in Supabase when the user is signed in.
