# WouldYouIQ — Handoff

_Last updated: 2026-09-03, after commit `9a220bc` (App Store readiness remediation)._

## What this project is

WouldYouIQ is a local-first priority app built with Expo (React Native + TypeScript) in `wouldyouiq/`. Users rank tasks through pairwise "Would You?" choices, act on a single For You priority, track a monthly budget, and can import a course syllabus with AI to turn assignments into tasks. The app works fully without an account; signing in (Apple or Google via Supabase) adds cloud sync.

## Current state

An App Store release audit (`APP_STORE_RELEASE_AUDIT.md`, produced with the Codex `apple-app-store-release` skill, verdict **NOT READY**) found 12 blockers. All repository-owned blockers were remediated in commit `9a220bc`. The app is **code-complete for submission but not yet submittable** — the remaining work is account setup, deployments, and content that only the owner can do (see "Next steps").

### Verified green

- `npm run typecheck` — clean
- `npm test` — 7/7 pass (includes new syllabus due-date mapping tests)
- `npx expo-doctor` — 18/18 checks pass
- `npx expo export --platform ios` — succeeds; exported bundle contains **no** OpenRouter key or endpoint
- `npx expo prebuild` inspection — Apple sign-in entitlement present, display name `WouldYouIQ`, bundle ID `com.milankinzy.wouldyouiq`, `ITSAppUsesNonExemptEncryption=false`, photo-library purpose string present

### What changed in the remediation

| Area | Change |
|------|--------|
| Secrets | Client-side OpenRouter code deleted (`lib/openrouter.ts`, `lib/aiMagic.ts`, `components/AiMagicPanel.tsx`). `.env` untracked; `.env.example` added. **The old key is still in git history — it must be rotated.** |
| AI feature | "AI Magic" (bank-statement OCR) repurposed into **Syllabus import** (`app/(tabs)/syllabus.tsx`, visible tab): PDF via `expo-document-picker`, photo via `expo-image-picker` (system picker, no permission prompt), or pasted text → review extracted assignments with due dates → save as tasks. Mapping helpers in `lib/syllabusMapping.ts` (pure, unit-tested); network call in `lib/syllabus.ts`. |
| AI consent | Consent sheet naming OpenRouter/Anthropic shown before first transmission; stored device-side in `lib/aiConsent.ts`; revocable in Settings (Guideline 5.1.2(i)). |
| Backend | New Supabase Edge Functions: `supabase/functions/syllabus-extract` (JWT-verified AI proxy, 20 req/user/day via new `ai_usage` table from migration `004_ai_usage.sql`, `provider.zdr: true`) and `supabase/functions/delete-account` (service-role `deleteUser`; all user tables cascade from `auth.users`). Docs in `supabase/README.md`. |
| Auth | Sign in with Apple added (`expo-apple-authentication` + `signInWithIdToken` with hashed nonce, in `components/SyncProvider.tsx`); Google kept but unnecessary `access_type=offline`/`prompt=consent` removed; sessions now AES-encrypted (key in SecureStore, ciphertext in AsyncStorage — `lib/supabase.ts`). |
| Account deletion | `deleteAccount` in SyncProvider + confirm-gated "Delete Account & Data" in Settings (Guideline 5.1.1(v)). |
| Settings | Dead "Upgrade to Pro" card removed; "Reset Demo Data" → confirm-gated "Reset App Data"; new About & Privacy section (policy/support links from `constants/links.ts`, app version, AI consent revocation). |
| Identity | `app.json`: name `WouldYouIQ`, bundle ID `com.milankinzy.wouldyouiq` (**placeholder — confirm before first upload**), `supportsTablet: false` (iPad layout untested; iPhone-only for v1), hardcoded `buildNumber` removed (EAS remote versioning handles it). |
| Accessibility | Roles/labels/states on all shared primitives (`components/primitives.tsx`) and tab bar; `lib/useReducedMotion.ts` gates confetti, XP float, and completion overlay animations. |
| Dependencies | `expo install --fix` applied; `npm audit fix` run (39 → ~26 advisories, no criticals); added picker/auth/crypto/secure-store libs + `babel-preset-expo` devDep. |

## Next steps (in order)

### 1. Urgent, independent of everything else

- [ ] **Rotate the OpenRouter API key** (dashboard → revoke + recreate). The old key sat in a git-tracked `.env` and is compromised in history. Never put the new key in an `EXPO_PUBLIC_*` var.
- [ ] Enable **Zero Data Retention** in the OpenRouter account settings.

### 2. Apple Developer account (24–48h lead time)

- [ ] Enroll in the Apple Developer Program ($99/yr).
- [ ] Decide the final bundle ID. `com.milankinzy.wouldyouiq` in `app.json:20` is an unregistered guess — confirm or replace it, then register it. It cannot change after the first upload.
- [ ] Run `eas credentials` so EAS syncs the Sign in with Apple capability.

### 3. Backend deployment (Supabase)

- [ ] Run migration `supabase/migrations/004_ai_usage.sql` (SQL Editor or `supabase db push`).
- [ ] `supabase functions deploy syllabus-extract delete-account`
- [ ] `supabase secrets set OPENROUTER_API_KEY=<new key>`
- [ ] Enable the **Apple** auth provider in the Supabase dashboard; add the iOS bundle ID as an authorized client ID (native flow needs no service-ID secret).
- [ ] Smoke test: `GET` the `syllabus-extract` URL → `{"ok":true}`.

### 4. Legal pages

- [ ] Publish a privacy policy + support page (plan assumed GitHub Pages at `milankinzy.github.io/wouldyouiq-legal/`). The policy must name OpenRouter as an AI processor, describe what syllabus content is sent, cover Apple/Google sign-in data, and explain account deletion.
- [ ] Put the final URLs in `constants/links.ts` (currently placeholders — App Review will follow these links).

### 5. Device testing

- [ ] `npx expo run:ios` on a device or `eas build --profile development` (Apple sign-in does **not** work in Expo Go).
- [ ] Test: Apple sign-in, Google sign-in, syllabus PDF + photo import end-to-end, consent gate + revoke (Settings), account deletion (verify rows gone in Supabase dashboard), reset-data confirm, VoiceOver spot-check, Reduce Motion on.

### 6. Build and submit

- [ ] `eas build --profile production --platform ios` → TestFlight → fresh-install pass.
- [ ] App Store Connect record: the **App Store Connect answer sheet**, **draft review notes**, and **screenshot shot list** inside `APP_STORE_RELEASE_AUDIT.md` cover every field. iPhone screenshots only (no iPad set needed with `supportsTablet: false`). Provide a non-expiring review account and note that sign-in is optional and gates only the AI feature.
- [ ] `eas submit --platform ios`.

## Known loose ends / debt

- **npm audit**: ~26 advisories remain (17 moderate, 9 high, no criticals) after `npm audit fix`. Mostly build-toolchain packages that don't ship in the bundle; a reachability triage before 1.0 would be diligent but is not a hard blocker.
- **Due dates are lossy**: the domain `Deadline` type is only `'today' | 'this week' | null`, so exact syllabus due dates live in the task's detail text ("Due Fri Sep 12 — …") and map to the nearest bucket (`lib/syllabusMapping.ts`). Extending `Task` with a real `dueDate` field is a clean follow-up — sync is a jsonb snapshot, so no DB migration needed — but it touches sorting/urgency logic.
- **`.expo/types/router.d.ts`** was hand-patched after the route rename; it regenerates automatically on the next `expo start`.
- **iPad** is deliberately off (`supportsTablet: false`). Revisit post-launch with real iPad layout work.
- **Web platform**: the app still runs on web, but Apple sign-in is iOS-only and destructive confirms use `window.confirm` there. Web is not part of the App Store release path.
- `ui_redesign/` is a design prototype only — never use its PNGs as store screenshots.

## Where to look

| Thing | Location |
|-------|----------|
| Release audit + submission field sheets | `APP_STORE_RELEASE_AUDIT.md` (repo root) |
| App source | `wouldyouiq/` (screens in `app/`, shared UI in `components/`, state in `domain/`, data/sync in `data/`) |
| Edge functions + migrations + deploy docs | `wouldyouiq/supabase/` |
| Public URLs (privacy/support) | `wouldyouiq/constants/links.ts` |
| Checks | `npm run typecheck`, `npm test`, `npx expo-doctor` (run inside `wouldyouiq/`) |
