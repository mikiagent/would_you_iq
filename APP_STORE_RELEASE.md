# App Store release audit

- App and version: WouldYouIQ 1.0.0; signed candidate build 7; current TestFlight build 6
- EAS build ID: `cd160fe6-4960-4afb-8046-cf3571a6699c`
- Platforms and device families: iOS, iPhone only
- Distribution channel: Public App Store; TestFlight for the release candidate
- Intended storefronts: Owner decision; App Store availability is not configured yet
- Audit depth: Release audit, repository remediation, and submission package
- Apple sources checked on: September 6, 2026
- Overall status: **NOT READY**

## Blockers

1. Signed build 7 contains the Sign in with Apple deletion-revocation client and complete first-party privacy manifest, but must not be uploaded until the matching server function is configured and deployed.
2. The `delete-account` Edge Function needs `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`, then must be deployed and exercised with an Apple-linked test account.
3. App Store Connect has no screenshots, selected store build, description, keywords, support URL, copyright, category, privacy answers, age rating, starting price, or storefront availability.
4. The App Store name is currently `WouldYouIQ (d80381)`, which does not match the product name. Rename it to `WouldYouIQ` if Apple accepts the name, or choose a deliberate public name.
5. The final TestFlight candidate has not completed a clean-install test on a physical iPhone.

## Repository changes made

- Added Sign in with Apple reauthentication and server-side token revocation before account deletion.
- Added first-party privacy-manifest declarations for optional cloud account, task, syllabus, budget, and ranking data.
- Corrected the README to describe five tabs and reviewable syllabus results rather than automatic task creation.
- Updated privacy and support pages to describe Apple authorization revocation accurately.
- Prepared five current, no-alpha, 1320 × 2868 App Store screenshots under `release-evidence/app-store-2026-09-07/`.

## Human actions required

1. In Apple Developer, create a Sign in with Apple key for `com.milankinzy.wouldyouiq`. Store the key securely; never commit the `.p8` file.
2. Set the four Apple secrets in Supabase, deploy `delete-account`, and test deletion end to end with a disposable Apple-linked account.
3. After the server function is ready, upload build 7 and test it from TestFlight on a physical iPhone.
4. Confirm the public app name, storefronts, free pricing, automatic-versus-manual release, content-rights answer, and DSA trader status.
5. Complete and publish App Privacy and the age-rating questionnaire, using the answer sheet below.
6. Supply an App Review phone number. Keep personal credentials out of this file.

## Conditional branches applied

- Accounts and authentication: Apple and Google sign-in; optional cloud sync; in-app account deletion.
- Third-party AI: optional syllabus content sent through Supabase to OpenRouter and a routed Anthropic endpoint after explicit consent.
- Protected resources: user-selected photos and documents only; no camera, microphone, location, contacts, or tracking permission.
- Financial information: user-entered monthly income and budget entries; this is a planning tool, not a regulated financial service.
- User-generated content moderation: not applicable because content is private to its owner and is not published or shared with other users.
- Payments, subscriptions, ads, notifications, background modes, health, crypto, gambling, chat, App Clips, extensions, and Game Center: not present.

## Verification performed

- TypeScript: pass.
- Logic tests: 17/17 pass.
- Expo Doctor: 18/18 checks pass.
- Web production export: pass.
- Deno type-check: both Edge Functions pass.
- Generated iOS privacy manifest: valid plist with seven collected-data categories and no tracking.
- App icon: 1024 × 1024 with no alpha channel.
- Signed store artifact build 7: valid distribution signature, bundle ID `com.milankinzy.wouldyouiq`, version 1.0.0 (7), iPhone-only, minimum iOS 15.1, Xcode 26/iOS 26 SDK, Sign in with Apple entitlement, complete first-party privacy manifest, no icon alpha, and `ITSAppUsesNonExemptEncryption=false`.
- App Store Connect: build 6 is processed and selectable; TestFlight shows `Ready to Submit` with one invitation.
- Clean simulator launch on iOS 26.4: landing, onboarding, sample-data setup, Tasks, Would You, For You, Budget, and Task ELO render correctly.
- Public privacy, privacy choices, and support pages return HTTP 200.
- No client-side OpenRouter or service-role secret was found.

## Evidence table

| ID | Requirement | Status | Evidence | Fix or next action | Owner |
| --- | --- | --- | --- | --- | --- |
| A1 | Correct signed identity | PASS | Build 7: `com.milankinzy.wouldyouiq`, version 1.0.0 (7), distribution-signed | None | Engineering |
| A2 | Current SDK requirement | PASS | Build 7 uses Xcode 26 and iOS 26 SDK; Apple requires Xcode 26/iOS 26 SDK since Apr 28, 2026 | None | Engineering |
| A3 | Store metadata and build selection | FAIL | App Store Connect version 1.0 fields are empty and no build is selected | Enter the answer sheet, upload screenshots, select build 7 | Owner |
| A4 | Accurate screenshots | PASS | Five current 1320 × 2868 JPEGs, no alpha, show the five-tab design | Upload to the 6.9-inch slot in Media Manager | Owner |
| A5 | App privacy answers | FAIL | App Privacy shows no policy URL and `Get Started` | Complete and publish the declarations below | Owner |
| A6 | Privacy manifest | PASS | Build 7 embeds seven linked, non-tracking data declarations plus required-reason API declarations | None | Engineering |
| A7 | Account deletion | FAIL | New revocation code exists locally; production function v2 lacks the change and Apple secrets are absent | Configure, deploy, and test with an Apple-linked account | Engineering + owner |
| A8 | Review access | NEEDS HUMAN ACTION | Core app works signed out; cloud/AI requires Apple or Google sign-in | Uncheck “Sign-in required”; explain optional sign-in in review notes | Owner |
| A9 | Privacy/support URLs | PASS | Live policy, privacy choices, and support pages return 200 and are available inside Settings | Add URLs to App Store Connect | Owner |
| A10 | Age rating | FAIL | App Information shows `Set Up Age Ratings` | Complete questionnaire; expected result is 4+ if all facts below are confirmed | Owner |
| A11 | Price and availability | FAIL | `Add Pricing` and `Set Up Availability` are still shown | Set free price and intended storefronts | Owner |
| A12 | DSA status | NEEDS HUMAN ACTION | App is marked non-trader; Apple says the account still needs compliance completion to change it | Confirm legal classification and intended EU availability | Owner |
| A13 | Export compliance | NEEDS HUMAN ACTION | App uses HTTPS and standard AES session encryption; plist says exempt/no non-exempt encryption | Confirm App Store Connect export answers; upload documentation only if Apple requests it | Owner |
| A14 | Physical-device release test | NEEDS HUMAN ACTION | Simulator checks pass; no clean physical-iPhone evidence for build 7 | Complete the checklist below in TestFlight | Owner |
| A15 | Dependency advisories | NEEDS HUMAN ACTION | `npm audit --omit=dev` reports 17 moderate and 9 high advisories in the Expo/Metro build chain; automated fixes require a breaking Expo 57 upgrade | Schedule an Expo upgrade after release; do not run `npm audit fix --force` on this candidate | Engineering |

## Privacy data inventory

The app works locally without collecting task or budget content. The rows below describe the maximum behavior when a user opts into an account, cloud sync, syllabus storage, or AI scanning.

| Data type | Collector | Collected | Linked | Tracking | Purpose | Recipient | Retention and deletion | User control | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Name | Auth/profile | Optional | Yes | No | Account profile and personalization | Supabase; Apple/Google during sign-in | While account exists; deleted with account | Edit profile, sign out, delete account | `SyncProvider`, `profiles` migration |
| Email address | Auth/profile | Optional | Yes | No | Authentication and account recovery | Supabase; Apple/Google | While account exists; provider logs may follow provider policy | Sign out, delete account | `SyncProvider`, `profiles` migration |
| User ID | Auth/cloud | Optional | Yes | No | Authentication, authorization, sync, rate limiting | Supabase | While account exists; deleted with account | Delete account | Supabase Auth, RLS migrations |
| Other user content | Tasks, details, projects, rankings, syllabus text/PDF | Optional cloud collection | Yes | No | App functionality and personalized priority ranking | Supabase; selected syllabus content also goes to OpenRouter/provider only when scanning | Synced data until deletion; AI content processed under ZDR; provider metadata follows provider policy | Local-only use, delete items, revoke AI consent, delete account | Store, storage layer, Edge Function, policy |
| Photos or videos | Selected syllabus photo | Optional | Yes | No | Store and scan the selected syllabus | Supabase; OpenRouter/provider only when scanning | Private storage until deletion; AI content processed under ZDR | System picker, delete syllabus, revoke consent, delete account | Image picker config, syllabus storage |
| Other financial information | Monthly income and budget entries | Optional cloud collection | Yes | No | Budget planning and personalized prioritization | Supabase | Until account deletion | Edit/reset data, local-only use, delete account | Budget store and cloud snapshot |
| Product interaction | Ranking choices, ELO, progress, onboarding state | Optional cloud collection | Yes | No | App functionality and personalized ordering | Supabase | Until account deletion | Local-only use, reset data, delete account | Cloud snapshot |
| Request metadata | Model, token counts, latency, cost; daily usage count | Yes when AI scan is used | Daily count is linked in Supabase; OpenRouter metadata is not syllabus content | No | Reliability, billing, rate limit | Supabase; OpenRouter | Supabase count deleted with account; OpenRouter policy controls metadata retention | Do not use AI; revoke consent; delete account | `syllabus-extract`, OpenRouter documentation |

### Privacy reconciliation

1. Source and runtime behavior: matches the inventory above.
2. Backend behavior: private owner paths, RLS, JWT-protected functions, and account cascades are present. Cross-account testing still requires two live accounts.
3. Third-party behavior: OpenRouter `provider.zdr: true` restricts routing to ZDR endpoints. The owner must confirm OpenRouter input/output logging remains disabled for the production key.
4. Privacy manifest: updated to match first-party optional cloud collection and no tracking.
5. Privacy policy: live and consistent with the source after the new deletion path is deployed.
6. App Store privacy answers: not yet entered; use the proposal below.

## App Store Connect answer sheet

### Identity and discovery

- Name — **owner decision**: `WouldYouIQ` (preferred; use only if Apple accepts it)
- Subtitle — **draft**: `Turn priorities into action`
- Primary language — **verified**: English (U.S.)
- Primary category — **draft**: Productivity
- Secondary category — **draft**: Education
- Bundle ID — **verified**: `com.milankinzy.wouldyouiq`
- SKU — **verified**: `EX1788562167210`
- Apple ID — **verified**: `6808812894`
- Copyright — **draft**: `2026 Milan Kinzy`
- Content rights — **owner decision**: confirm rights to the app icon, fonts, code, screenshots, sample data, and all bundled assets. User-selected syllabi are private inputs and are not redistributed.

### Product-page copy

- Promotional text — **draft, 130/170 characters**:

  `Stop guessing what to do next. Compare tasks, build a personal ELO priority ranking, and focus on one meaningful action at a time.`

- Keywords — **draft, 84/100 characters**:

  `priority planner,tasks,to-do,focus,productivity,ELO,decision,budget,student,syllabus`

- Description — **draft**:

  WouldYouIQ turns an overwhelming task list into one clear next move.

  Static priority labels go stale. WouldYouIQ uses quick, two-choice comparisons to learn what matters to you right now. Each decision updates a personal ELO ranking, so your task list adapts as your priorities change.

  Use WouldYouIQ to:

  • Compare tasks, projects, and budget choices in seconds
  • See task and project ELO boards ranked by importance
  • Get one focused “For You” recommendation instead of another endless list
  • Organize tasks into projects, steps, lists, and boards
  • Reorder tasks with drag and drop or accessible move controls
  • Track a monthly budget alongside the priorities it supports
  • Store course syllabi privately and optionally scan them for reviewable assignments and due dates

  Core task ranking and budgeting work locally without an account. Sign-in is optional for cloud sync and syllabus storage. AI syllabus scanning is optional, consent-gated, and never creates tasks automatically.

- Support URL — **verified**: `https://mikiagent.github.io/would_you_iq/support/`
- Marketing URL — **draft**: `https://mikiagent.github.io/would_you_iq/`
- Privacy Policy URL — **verified**: `https://mikiagent.github.io/would_you_iq/privacy/`
- User Privacy Choices URL — **verified**: `https://mikiagent.github.io/would_you_iq/privacy-choices/`
- Version — **verified in record**: `1.0`; uploaded binary marketing version is `1.0.0` and build 7 should remain selectable under this version.
- Release option — **owner decision**: Manual release is safer for a first launch; the record currently selects automatic release.

### App Privacy proposal

- Data used to track the user — **No**
- Name — linked to user; App Functionality
- Email Address — linked to user; App Functionality
- User ID — linked to user; App Functionality
- Other User Content — linked to user; App Functionality and Product Personalization
- Photos or Videos — linked to user; App Functionality
- Other Financial Info — linked to user; App Functionality and Product Personalization
- Product Interaction — linked to user; App Functionality and Product Personalization
- Do not declare advertising, marketing, analytics, location, contacts, health, payment information, purchases, device ID, or tracking unless the implementation changes.

### Age rating proposal

Confirm each answer before saving:

- Parental controls and age assurance: None
- Unrestricted web access: No
- User-generated content shared with other users: No
- Social media, messaging/chat, advertising: No
- Profanity, horror, alcohol/drugs, mature themes, sexual content/nudity, violence, guns/weapons: None
- Medical or treatment information, health or wellness topics: None
- Gambling, simulated gambling, contests, and loot boxes: None
- Kids Category: No
- Expected result after confirmation: 4+

### Pricing and availability

- Starting price — **draft**: Free
- Tax category — **verified**: App Store software
- Distribution — **verified**: Public App Store
- Storefronts — **owner decision**
- Apple silicon Mac availability — **owner decision**: currently enabled but not tested; disable for the first release unless you intentionally support it and complete Mac runtime checks.
- Apple Vision Pro — build 1.0 is currently marked incompatible.
- In-app purchases/subscriptions — **verified**: None

### App Review information

- Sign-in required — **draft**: Unchecked. Core functionality is available without an account.
- Contact first/last name — **verified**: Milan Kinzy
- Contact email — **verified**: `milan.kinzy@gmail.com`
- Contact phone — **owner required**
- Demo credentials — **not required for core flow**. Reviewers can test optional cloud behavior with Sign in with Apple. Do not place personal credentials in this file.

## Review notes and reviewer test instructions

**Draft review notes:**

WouldYouIQ is a native, local-first priority app. Core task ranking, the For You recommendation, and budgeting work without an account.

To reach a populated test state: launch the app, tap Get Started, tap Skip to end, choose Add sample data, and close the guided tour.

Important paths:

1. Tasks: open Tasks. The Tasks/ELO/Context control is at the top. Long-press a task or project for its action menu. Drag its handle to reorder it; tapping the handle starts an accessible move mode.
2. Pairwise ranking: open Would You? and switch between Projects, Tasks, and Budget. Choose Yes/No, Skip, or Essential. Choices update the relevant ELO ranking.
3. Focus: open For You to see the highest-priority next action and start its focus runner.
4. Syllabus context: open Tasks → Context. Sign in with Apple, store a selected PDF/photo/text source, then choose Scan. A separate consent sheet appears before content is sent through Supabase to OpenRouter and a routed Anthropic endpoint. Results are reviewable assignments and due dates; the app does not automatically create tasks.
5. Account deletion: Settings → Danger zone → Delete Account & Data. Apple-linked accounts require Apple confirmation so the server can revoke the Apple token before deleting the Supabase account, private syllabus files, synced data, and local session.

The app uses the photo/document picker only after the user chooses a syllabus source. It has no advertising, tracking, purchases, subscriptions, chat, or public user-generated content.

## Screenshot shot list

Upload the JPEG files to the 6.9-inch iPhone slot in Media Manager, in this order:

1. `01-tasks.jpg` — ranked tasks, projects, due dates, drag handles, and five-tab navigation.
2. `02-would-you.jpg` — the distinguishing pairwise ranking decision.
3. `03-for-you.jpg` — one focused next action.
4. `05-elo.jpg` — transparent task ELO ranking.
5. `04-budget.jpg` — monthly spending, leftover amount, and priority-aware budgeting.

All are portrait 1320 × 2868 JPEGs with no alpha channel and contain sample—not personal—data.

## Export compliance guidance

- The app uses HTTPS/TLS through Apple networking and Supabase/OpenRouter.
- Native auth sessions are encrypted with standard AES-CTR using a random key held in iOS Secure Store.
- No custom or proprietary cryptographic algorithm is implemented.
- `ITSAppUsesNonExemptEncryption=false` is present in the configuration and build 6 artifact.
- The owner must answer Apple’s export questions based on these facts. Do not upload encryption documentation unless App Store Connect determines it is required.

## Final physical-device checklist

On build 7 from TestFlight, using a clean physical iPhone:

1. Install, cold launch, complete onboarding, relaunch, background, and foreground.
2. Add/edit/reorder/complete/delete tasks and projects; exercise list and board views.
3. Rank projects, tasks, and budget choices; verify the matching ELO board changes.
4. Start, pause, resume, and finish a For You focus runner.
5. Deny and allow photo access; verify PDF and pasted-text alternatives.
6. Test offline behavior, then reconnect and verify local content remains.
7. Sign in with Apple, sync, sign out, sign back in, and verify restoration.
8. Store/open/delete a syllabus; consent to one AI scan; verify assignments and dates are reviewable.
9. Delete the disposable Apple-linked account and verify Apple authorization, Supabase account/data, syllabus files, and local session are removed.
10. Open Privacy Policy and Support from Settings and inspect device/runtime logs for crashes.

## Residual risks

- Apple—not the developer—decides approval. Accurate metadata and a working review path reduce but cannot eliminate rejection risk.
- The OpenRouter production account must keep prompt/input-output logging disabled so the live configuration continues to match the privacy policy.
- The dependency advisories are concentrated in the Expo/Metro toolchain. A forced audit fix would introduce a major framework upgrade and is inappropriate immediately before submission.
