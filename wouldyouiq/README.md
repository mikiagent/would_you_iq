# WouldYouIQ

Local-first priority calibration app: rank tasks through quick pairwise "Would You?" choices, act on a single For You priority, and keep a monthly budget aligned with what matters.

## Stack

- Expo (React Native, TypeScript), Expo Router (stack + tabs)
- Zustand store with on-device persistence (works fully signed out)
- Supabase: optional cloud sync (Sign in with Apple / Google), `app_state` snapshot + profiles
- Supabase Edge Functions: `syllabus-extract` (AI proxy) and `delete-account` — see `supabase/README.md`

## Features

- Tasks tab (list with filters)
- Would You? calibration tab (pairwise chooser that reorders priorities)
- For You tab (top-priority card, quick Done, focus runner)
- Budget tab (income, leftover, item alignment)
- Syllabus tab (AI import: PDF/photo/text → assignments → tasks, consent-gated)
- Settings tab (profile, sign-in, privacy links, account deletion, reset)

## Running

```bash
cd wouldyouiq
npm install
cp .env.example .env   # fill in your Supabase project values
npm run dev
```

Then open the Web URL shown in the terminal (usually `http://localhost:8081`), or press `i` for the iOS simulator. Apple sign-in requires a dev build (`npx expo run:ios`), not Expo Go.

## Checks

```bash
npm run typecheck
npm test
npx expo-doctor
```

## Secrets

Never put server secrets in `EXPO_PUBLIC_*` variables — they are inlined into the shipped JS bundle. The OpenRouter key lives only in Supabase Edge Function secrets (`supabase secrets set OPENROUTER_API_KEY=...`).
