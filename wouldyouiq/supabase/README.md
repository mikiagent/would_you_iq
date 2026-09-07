# Supabase setup for WouldYouIQ

Run the migrations in order in the **Supabase Dashboard → SQL Editor** (or via `supabase db push` if using Supabase CLI).

## Migrations

| File | Purpose |
|------|--------|
| **001** | Creates `profiles`, `tasks`, `budget_income`, `budget_items`; RLS so users only see their own data; trigger so new auth users get a profile row. |
| **002** | Adds `profiles.avatar_url` and `profiles.email`; updates triggers so new users get name/avatar/email from the auth provider, and profile is updated when auth user is updated. |
| **003** | Adds the `app_state` jsonb snapshot table used by cloud sync. |
| **004** | Adds `ai_usage` daily counters for the syllabus-extract rate limit (service-role only; RLS with no client policies). |
| **005** | Creates the private `syllabi` storage bucket, 5 MB upload limit, and owner-only file access policies. Source metadata and extracted homework remain in `app_state`. |

Fresh project: run 001 → 002 → 003 → 004 → 005 in order. Existing project: run only the ones you haven't applied.

## Edge functions

Two functions live in `functions/` and must be deployed with the Supabase CLI:

```sh
supabase functions deploy syllabus-extract
supabase functions deploy delete-account
supabase secrets set OPENROUTER_API_KEY=<server-side key, never EXPO_PUBLIC_*>
```

Apple-linked account deletion also needs a Sign in with Apple key. Add these
Edge Function secrets, keeping the `.p8` private key out of the repository and
client build:

```sh
supabase secrets set APPLE_CLIENT_ID=com.milankinzy.wouldyouiq
supabase secrets set APPLE_TEAM_ID=<Apple Developer team ID>
supabase secrets set APPLE_KEY_ID=<Sign in with Apple key ID>
supabase secrets set APPLE_PRIVATE_KEY=<contents of the .p8 key>
```

- **`syllabus-extract`** — authenticated AI proxy for syllabus import. Verifies the caller's JWT, rate-limits to 20 requests/user/day via `ai_usage`, and forwards PDF/image/text content to OpenRouter (`anthropic/claude-haiku-4.5`) with zero-data-retention routing (`provider.zdr: true`). Also enable Zero Data Retention in the OpenRouter dashboard. `GET` returns `{ "ok": true }` for smoke tests.
- **`delete-account`** — for Apple-linked accounts, exchanges a fresh native authorization code and revokes the Apple token; then deletes private syllabus files and the calling user's auth account. All user tables cascade from `auth.users`, so profile, snapshot, tasks, budget, and AI-usage rows are removed with it. Required for App Review Guideline 5.1.1(v).

## Auth providers

- **Google** — configure per Supabase docs (OAuth web flow via `expo-web-browser`).
- **Apple** — enable the Apple provider and add the iOS bundle ID as an authorized client ID. The app uses the native `signInWithIdToken` flow, which needs no service-ID secret.

## Data flow

- **Sign up**: Auth insert → trigger creates a row in `profiles` with name, avatar_url, email from the provider.
- **Sign in**: App hydrates from Supabase, then merges auth user (name, avatar, email) into the local profile and pushes once so Supabase has the latest user info.
- **Ongoing**: App pushes profile, tasks, and budget data to Supabase after changes (debounced). Cloud sync writes to `profiles` + `app_state` (jsonb snapshot).
