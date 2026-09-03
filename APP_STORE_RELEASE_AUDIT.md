# App Store release audit

- App and version: WouldYouIQ, source version 1.0.0, source build 1
- Platforms and device families: iOS and iPadOS, iPhone and iPad
- Distribution channel: Apple App Store through EAS Build and App Store Connect
- Intended storefronts: Not provided
- Release type: Assumed first public release because the source version and build are 1.0.0 (1)
- Audit depth: Release audit and owner plan, limited by the absence of a signed archive, CocoaPods, App Store Connect access, credentials, and physical-device testing
- Apple sources checked on: 2026-09-03
- Overall status: **NOT READY**

## Bottom line

Do not upload this build to App Store Connect yet. It has direct rejection risks under App Review Guidelines 2.1, 4.8, 5.1.1, and 5.1.2. The highest-risk issue is more serious than review: the production iOS JavaScript bundle contains a live OpenRouter secret.

The shortest credible release path is:

1. Rotate the exposed OpenRouter key and move AI requests behind a server endpoint.
2. Add a clear third-party AI disclosure and explicit consent before transmitting any user content.
3. Add Sign in with Apple alongside Google, or remove social login and cloud accounts from version 1.
4. Add full in-app account deletion and provider-token revocation.
5. Replace the web-only image picker with a native iOS picker.
6. Remove the nonfunctional Pro offer and scrub demo or experimental release copy.
7. Add an in-app privacy policy link, finish the privacy package, and complete the accessibility pass.
8. Replace the placeholder app identity, update dependencies, create a signed Release archive, and run the clean-device test matrix.

## Blockers

### P0 security and privacy blockers

#### 1. OpenRouter secret ships in the app

`lib/openrouter.ts:158-219` reads `EXPO_PUBLIC_OPENROUTER_API_KEY` in client code and sends requests directly to OpenRouter. A production `expo export --platform ios` completed successfully, and a binary-safe search confirmed that the current OpenRouter key and endpoint are in the Hermes bundle.

Why this fails: anyone who obtains the app can recover and misuse the key. It also prevents server-side abuse controls, per-user quotas, audit logging, and reliable enforcement of provider privacy settings. Apple Guideline 1.6 requires appropriate security for user information.

Required action:

- Revoke and rotate the current OpenRouter key now.
- Do not place the replacement in any `EXPO_PUBLIC_` variable.
- Create a server or Supabase Edge Function that owns the credential, authenticates the app user, rate-limits requests, validates payload size and type, and returns only the needed response.
- Enforce zero-data-retention routing for statement content. The present request has no `provider.zdr: true` setting.
- Add monitoring and a provider kill switch.
- Re-export iOS and prove the replacement secret is absent from the bundle.

The Supabase anon key also appears in the bundle, but that key is designed for a public client. Its safety depends on correct deployed Row Level Security policies.

#### 2. Personal and financial content is sent to third-party AI without explicit permission

`app/(tabs)/ai-magic.tsx:157-213` tells the user that AI Magic can process bank statements, screenshots, and text, but it does not identify OpenRouter or the model provider, explain that data leaves the device, describe retention, or obtain explicit permission. `lib/openrouter.ts:202-218` sends the full text or image to OpenRouter.

Apple Guideline 5.1.2(i) now says apps must clearly disclose where personal data is shared, including third-party AI, and obtain explicit permission before sharing it.

Required action:

- Put a concise disclosure immediately before the first transmission. Name OpenRouter and explain that a selected model provider processes the content.
- State which content is sent, why, whether it is stored, and how the user can withdraw consent.
- Require an affirmative consent action. Do not preselect it.
- Store the consent version and timestamp. Let the user revoke consent in Settings.
- Keep manual text import available when AI consent is declined.
- Add the same facts to the privacy policy and App Store privacy answers.

#### 3. There is no privacy policy in the app

No privacy policy, privacy choices, support, or legal link exists in `app/`, `components/`, `constants/`, `data/`, or `lib/`. Apple Guideline 5.1.1(i) requires a privacy-policy link both in App Store Connect and inside the app in an easy-to-find place.

Required action:

- Publish a policy that names the actual data, recipients, purposes, retention, deletion, security controls, and consent-revocation path.
- Link it from Settings and App Store Connect.
- Add a privacy-choices screen or URL covering AI consent, cloud sync, export, and account deletion.
- Do not publish a policy until the OpenRouter and account-deletion designs are final.

#### 4. The OAuth flow asks for unnecessary offline Google access

`components/SyncProvider.tsx:351-383` requests `access_type: offline` and `prompt: consent`. The app never calls Google APIs. Supabase documents these parameters as the way to obtain a Google provider refresh token. `lib/supabase.ts:33-41` persists the full Supabase session in AsyncStorage, and the installed Supabase client saves the complete session object, including provider tokens when present.

Required action:

- Remove `access_type: offline` and `prompt: consent` unless a reviewed feature actually needs Google API access.
- Revoke already issued Google grants during remediation testing.
- Use an appropriate secure-storage design for long-lived authentication material.
- Test sign-out, account deletion, reinstall, lost-device behavior, and token revocation.

### P0 App Review blockers

#### 5. Google login has no equivalent privacy-preserving option

`components/SyncProvider.tsx:351-384` implements Google as the only account login. Apple Guideline 4.8 requires an equivalent login option that supports limited data collection, private email, and no unconsented advertising profiling. No listed exemption fits this consumer productivity app.

Required action:

- Add Sign in with Apple through Supabase and the Apple capability, with account linking and duplicate-account handling.
- Keep local use available without login. The current product already supports this and should continue to do so.
- Alternatively, remove Google login and cloud accounts from version 1. This is the smaller release, but it also removes cross-device sync.

#### 6. Users cannot delete an account from the app

Settings exposes sign-in and sign-out only. `components/SyncProvider.tsx:386-405` clears local state during sign-out but does not delete the Supabase Auth user, profile, snapshot, or Google authorization. The database foreign keys can cascade after an Auth user is deleted, but no trusted deletion endpoint or in-app flow exists.

Apple Guideline 5.1.1(v) requires in-app account deletion when account creation is supported.

Required action:

- Add "Delete account" in Settings with reauthentication, a clear scope summary, confirmation, and completion state.
- Use a trusted server function to delete the Supabase Auth user. Confirm the profile, `app_state`, task, budget, session, and provider records are removed.
- Revoke Google and Sign in with Apple tokens as applicable.
- Explain any legally required retention. None is evident from the current product.
- Test the full flow with real accounts and prove the user cannot sign back into the deleted account without creating a new one.

#### 7. Image upload does nothing on iPhone and iPad

`app/(tabs)/ai-magic.tsx:65-86` returns immediately when `document` is unavailable. The visible "Upload Image" button at line 191 therefore does nothing in native iOS. The duplicate `components/AiMagicPanel.tsx` has the same web-only implementation.

This is a direct Guideline 2.1 completeness failure.

Required action:

- Use an iOS-compatible picker, preferably the system picker that does not require full photo-library access.
- Handle cancellation, oversized files, unsupported formats, low-memory conditions, redaction, offline state, and upload failure.
- Remove the unused duplicate panel or prove which implementation ships.
- Test on a physical iPhone and iPad.

#### 8. The app advertises a Pro product that cannot be purchased

`app/(tabs)/settings.tsx:61-75` advertises WouldYouIQ Pro and an "Upgrade to Pro" button whose handler is empty. Apple can treat this as unfinished or misleading functionality under Guidelines 2.1 and 2.3.1.

Required action for version 1:

- Remove the entire Pro card and every premium claim.
- If paid digital features are required for version 1, implement StoreKit, App Store Connect products, entitlement handling, restore, refund and revocation behavior, subscription terms, privacy and terms links, and sandbox tests. Do not use a web checkout.

#### 9. Release identity is still a placeholder

`app.json:3-5` uses the display name `wouldyouiq`. `app.json:20` uses `com.anonymous.wouldyouiq`. A generated native project confirmed `CFBundleDisplayName=wouldyouiq` and the same placeholder bundle ID.

Required action:

- Choose the owned reverse-DNS bundle ID before the first upload. It cannot be changed after a build is uploaded to the app record.
- Set the display name to the approved product spelling, expected to be `WouldYouIQ`.
- Register the identifier, update the EAS project association, and verify the App Store Connect record matches.
- Confirm the version and build because `eas.json:4` uses remote version sourcing.

### P1 release-quality blockers

#### 10. The dependency baseline is not release-ready

`expo-doctor` passed 17 of 18 checks but found six Expo patch mismatches. `npm audit --omit=dev` reported 39 advisories: 2 critical, 18 high, 18 moderate, and 1 low. Many findings are in build tooling, so the audit does not prove all are reachable in the shipped app. They still need triage before release.

Required action:

- Run `npx expo install --check` and update to the SDK 54 patch versions Expo expects, or move to a newer supported Expo SDK after testing.
- Update direct and transitive dependencies without using forced incompatible downgrades.
- Record which audit findings are build-only and which can enter the iOS bundle or backend runtime.
- Rerun `expo-doctor`, typecheck, tests, iOS export, native build, and dependency audit.

#### 11. Accessibility semantics are missing

A repository search found no `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, `AccessibilityInfo`, or reduced-motion handling. Examples include the unlabeled FAB and toggle in `components/primitives.tsx:168-175` and `components/primitives.tsx:236-256`, plus the unlabeled custom tab controls in `components/TabBar.tsx:41-57`.

Required action:

- Give every interactive control a role, label, state, hint where useful, and a sensible focus order.
- Label emoji-only buttons, star toggles, checkboxes, charts, drag actions, and progress indicators.
- Add accessible alternatives to swipe and drag interactions.
- Support Dynamic Type without clipping and honor Reduce Motion for confetti and large animations.
- Test all common tasks with VoiceOver, Voice Control, Larger Text at 200%, sufficient contrast, and Reduce Motion on both iPhone and iPad.
- Do not claim Accessibility Nutrition Label support until every common task passes the current Apple criteria.

#### 12. Development and demo language remains in the product

The PRD declares the product "In Development" at `PRD.md:1-4`. User-visible copy includes "Experimental OCR" in `app/(tabs)/ai-magic.tsx:157-163` and "Reset Demo Data" in `app/(tabs)/settings.tsx:78`. Onboarding offers sample data, which can be valid, but the shipped wording should not make the App Store build look like a beta or internal demo.

Required action:

- Decide whether AI Magic is production functionality. If not, remove it from the App Store build and use TestFlight.
- Rename "Reset Demo Data" to a real user action, such as "Reset app data," with a destructive confirmation.
- Keep sample data only if it is clearly optional and removable.
- Remove stale documentation claims such as `README.md:18`, which says Supabase is not wired even though cloud sync is implemented.

## Repository changes made

- Added this audit and release plan only.
- No application code, configuration, backend schema, dependency, credential, or App Store Connect value was changed.

## Human actions required

1. **Apple Developer account:** Provide proof of active membership, correct team and roles, registered bundle ID, distribution certificate, and provisioning profile.
2. **App Store Connect app record:** Provide screenshots or an export showing app name, bundle ID, SKU, primary language, categories, age rating, pricing, availability, privacy, export compliance, review contact, and build selection.
3. **Storefronts:** Choose countries and regions. If distributing in the EU, complete and verify DSA trader status. Apple has removed apps without required EU trader status.
4. **Backend:** Prove the production Supabase project has the migrations and RLS policies deployed. Run anonymous, same-account, and cross-account authorization tests. This audit environment could not resolve the project hostname, so no live backend test passed.
5. **AI vendor settings:** Capture OpenRouter organization privacy settings, logging settings, model endpoint and provider, region, retention, training policy, and ZDR enforcement. Confirm the downstream model provider's terms.
6. **Legal and content rights:** Confirm rights to the name, icon, screenshots, copy, AI output, Google Fonts packages, bundled fonts, and third-party code.
7. **Release artifact:** Install CocoaPods or build with EAS, create the final signed archive with Xcode 26 or later and the iOS 26 SDK or later, and retain the archive and validation output.
8. **Devices:** Run clean-install and upgrade tests on physical supported devices. At minimum, cover an iPhone and iPad on the current shipping OS. Use TestFlight for the final candidate.
9. **Review access:** Supply a durable review account or an approved full demo mode. A reviewer must not depend on a personal device, personal email, or one-time code.
10. **Agreements and commerce:** Confirm agreements, tax, banking, pricing, tax category, and Paid Apps agreement status. If the first version is free with no purchases, document that choice.

## Conditional branches applied

| Branch | Result | Classification fact |
| --- | --- | --- |
| Accounts and authentication | Applied | Google OAuth creates a Supabase account and enables cloud sync. |
| Third-party login | Applied | Google is the only social login. |
| Third-party AI | Applied | Statement images and text are sent to OpenRouter and a model provider. |
| Digital purchases | Not currently applicable | No StoreKit code or functioning purchase exists. The dead Pro UI is a completeness failure. |
| Sensitive financial content | Applied | Users enter income and expenses and can submit statement screenshots or text. The app is not a bank or regulated financial-service provider. |
| Protected resources | Not currently applicable | The native app does not actually invoke a photo picker. Reapply this branch after adding one. |
| User-generated public content and chat | Not applicable | User content is private and is not shared with other users. |
| Advertising, analytics, and tracking | Not applicable based on source | No ads, analytics SDK, ATT use, or cross-app tracking code was found. Vendor and archive verification remain required. |
| Background execution and notifications | Not applicable | No background modes or notification feature was found. |
| Web content and remote software | OAuth only | The app opens a visible browser authentication session. It does not ship a general WebView or downloaded executable code. |
| Extensions, App Clips, Game Center | Not applicable | No extension, App Clip, watch target, widget, or Game Center feature was found. |
| Kids Category | Not applicable to the stated product | The PRD targets adults aged 22 to 38. The owner must still complete the 2026 age-rating questionnaire. |
| Intellectual property | Applied | Fonts, app name, icon, screenshots, copy, libraries, and AI output require owner confirmation. |

## Evidence table

| ID | Requirement | Status | Evidence | Fix or next action | Owner |
| --- | --- | --- | --- | --- | --- |
| REL-01 | Final app identity | FAIL | `app.json:3-5,18-24`; generated iOS plist uses lowercase name and `com.anonymous.wouldyouiq` | Choose owned name and bundle ID before first upload | Product and Apple account owner |
| REL-02 | Current upload toolchain | PASS | Local Xcode 26.6; Apple requires Xcode 26 or later and an iOS 26 SDK or later since 2026-04-28 | Keep the final archive on a compliant toolchain | Engineering |
| REL-03 | iOS export | PASS | `npx expo export --platform ios` completed; Hermes bundle was 3.66 MB | Repeat after remediation | Engineering |
| REL-04 | Signed Release archive and App Store validation | NEEDS HUMAN ACTION | No `.xcarchive` or `.ipa`; CocoaPods is not installed; no signing or App Store Connect access | Build, sign, inspect, and validate final archive | Release owner |
| REL-05 | Device families | NEEDS HUMAN ACTION | `supportsTablet: true`; generated target family is `1,2`; iPad orientations include landscape | Test all layouts and rotation on iPhone and iPad | QA |
| REL-06 | Icon | PASS | `icon.png` is 1024 by 1024 with no alpha | Inspect compiled asset catalog in final archive | Design and engineering |
| REL-07 | Entitlements and capabilities | NEEDS HUMAN ACTION | Generated entitlements file is empty; Sign in with Apple is not implemented | Add only required capability, then inspect signed archive | Engineering |
| APP-01 | Final and complete native behavior | FAIL | Native Upload Image returns without action; Pro button handler is empty | Fix or remove both flows | Engineering and product |
| APP-02 | Production copy and state | FAIL | User-visible Experimental and Demo language; PRD says In Development | Scrub release build and move unfinished work to TestFlight | Product |
| APP-03 | Meaningful native utility | PASS | Native task ranking, budget, prioritization, local persistence, haptics, and navigation are implemented; app is not a thin WebView | Keep reviewer path clear | Product |
| APP-04 | Cold launch, lifecycle, offline, IPv6, recovery | NEEDS HUMAN ACTION | No release runtime evidence | Run clean-device matrix on final signed build | QA |
| AUTH-01 | Login-services rule | FAIL | Google is the only social login | Add Sign in with Apple or remove Google account login | Engineering |
| AUTH-02 | In-app account deletion | FAIL | Sign-out exists; deletion does not | Implement trusted end-to-end deletion and revocation | Engineering |
| AUTH-03 | Data minimization and token handling | FAIL | OAuth asks for offline access; full session uses AsyncStorage | Remove unused scope and secure long-lived tokens | Engineering and security |
| AUTH-04 | Reviewer access | NEEDS HUMAN ACTION | No durable review credentials or approved demo mode provided | Create and verify review access | Release owner |
| PRIV-01 | In-app and public privacy policy | FAIL | No policy or privacy link found | Publish and link accurate policy | Privacy owner and engineering |
| PRIV-02 | Third-party AI disclosure and consent | FAIL | Content is transmitted with no named third-party disclosure or consent gate | Add explicit consent before each newly scoped data use | Product, privacy, engineering |
| PRIV-03 | App privacy answers | FAIL | No reconciled App Store Connect answers; source proves linked data collection | Use the draft inventory below, then verify vendor behavior | Privacy owner |
| PRIV-04 | Data retention and deletion | FAIL | Supabase data persists; no deletion path; AI provider state unknown | Define, implement, and test retention and deletion | Privacy owner and engineering |
| PRIV-05 | Privacy manifests and required-reason APIs | NEEDS HUMAN ACTION | Eight dependency manifests found and valid; no built archive; Hermes is on Apple's listed SDK set | Generate archive privacy report and verify every embedded SDK | Engineering |
| SEC-01 | Client secrets | FAIL | OpenRouter key is confirmed in production Hermes bundle | Rotate and move to trusted server | Engineering and security |
| SEC-02 | Backend authorization | NEEDS HUMAN ACTION | SQL declares RLS on profile and app-state tables; live backend could not be reached from audit environment | Run deployed RLS and cross-account tests | Backend owner |
| SEC-03 | Dependency security | FAIL | 39 production-tree advisories and Expo version check failure | Upgrade, triage reachability, rerun audit | Engineering |
| A11Y-01 | Accessible common tasks | FAIL | No explicit accessibility semantics or reduced-motion code found | Implement semantics and alternatives, then test | Engineering and QA |
| A11Y-02 | Accessibility Nutrition Labels | NEEDS HUMAN ACTION | Apple says labels are currently optional, but claims require all common tasks to pass per device | Publish only tested claims | Product and QA |
| META-01 | Required metadata and URLs | NEEDS HUMAN ACTION | No App Store metadata export, support site, privacy URL, or review contact provided | Complete owner sheet below | App Store owner |
| META-02 | Screenshots | NEEDS HUMAN ACTION | No release-build App Store screenshot set exists | Capture real iPhone and iPad screens after fixes | Design and QA |
| META-03 | Age rating | NEEDS HUMAN ACTION | New 2026 questionnaire not supplied | Complete current questionnaire in App Information | App Store owner |
| REG-01 | Export compliance | NEEDS HUMAN ACTION | HTTPS, PKCE, and SDK cryptography are used; `ITSAppUsesNonExemptEncryption=false` is asserted but not documented | Answer current encryption questions and retain rationale | Account holder |
| REG-02 | DSA and regional availability | NEEDS HUMAN ACTION | Storefronts and trader status not supplied | Choose storefronts and complete required declarations | Account holder and legal |
| IP-01 | Content and license rights | NEEDS HUMAN ACTION | Third-party packages and fonts are present; owner proof not supplied | Retain license inventory and original-asset proof | Product and legal |

## Privacy data inventory

This inventory is a draft based on source. "Collected" follows Apple's definition of off-device transmission and retention beyond the real-time request. Local-only data is not collected for the App Store label, but cloud-synced data is.

| Data type | Collector | Collected | Linked | Tracking | Purpose | Recipient | Retention and deletion | User control | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Name | Google, Supabase, WouldYouIQ | Yes when signed in | Yes | No evidence of tracking | Authentication, profile, personalization | Google, Supabase, developer | Until account deletion; no deletion path exists | Edit locally, sign out only | `SyncProvider.tsx:67-87`; `cloudRepository.ts:55-74` |
| Email address | Google, Supabase, WouldYouIQ | Yes when signed in | Yes | No evidence of tracking | Authentication and account sync | Google, Supabase, developer | Until account deletion; no deletion path exists | Sign out only | `SyncProvider.tsx:67-87`; `cloudRepository.ts:55-74` |
| Profile photo URL | Google, Supabase, WouldYouIQ | Yes when signed in | Yes | No evidence of tracking | Profile display | Google, Supabase, developer | Until account deletion | Sign out only | `SyncProvider.tsx:67-87`; migration `002_profile_auth_sync.sql` |
| User ID | Supabase | Yes when signed in | Yes | No evidence of tracking | Authentication and authorization | Supabase, developer | Until account deletion | No deletion control exists | `app_state.user_id`; Supabase Auth |
| Other user content | WouldYouIQ and Supabase | Yes when cloud sync is active | Yes | No | App functionality and personalization | Supabase, developer | Snapshot persists until deletion | Delete individual tasks locally; no account-wide deletion | `domain/models.ts`; `cloudRepository.ts:30-40` |
| Other financial info | WouldYouIQ and Supabase | Yes when cloud sync is active | Yes | No | Budget feature and personalization | Supabase, developer | Income and expense data persist in profile and snapshot | Edit or delete items; no account-wide deletion | `cloudRepository.ts:55-70`; `app_state` migration |
| Photos or videos | OpenRouter and model provider | Undetermined for label; transmitted during AI use | May contain identity | No evidence of tracking | OCR and task or budget suggestions | OpenRouter and routed model provider | OpenRouter says image input is ephemeral except stated security, billing, or legal needs; downstream provider policy is not locked | No consent or revocation control | `ai-magic.tsx:184-192`; `openrouter.ts:202-218` |
| Other financial info in statement text or image | OpenRouter and model provider | Undetermined until ZDR and provider behavior are verified | May contain identity | No evidence of tracking | AI extraction | OpenRouter and routed model provider | Not enforced by request; provider may retain | No consent or revocation control | `openrouter.ts:174-219` |
| Product interaction | WouldYouIQ and Supabase | Yes when cloud sync is active | Yes | No | App functionality and personalization | Supabase, developer | XP, streak, comparisons, completion, onboarding, and arena state persist | No export or account-wide deletion | `AppSnapshot`; `cloudRepository.ts:30-70` |
| Request metadata | OpenRouter | Yes | Not shown as linked to the end user | No evidence of tracking | Service operation, reporting, billing | OpenRouter | Vendor says token counts, latency, and similar metadata are retained | No in-app control | OpenRouter data-collection documentation |
| Auth and provider tokens | Device and Supabase Auth | Yes for Supabase session; provider token handling depends on OAuth result | Yes | No | Authentication | Device storage, Supabase, Google | Supabase sessions can last indefinitely by default; offline Google grant is requested | Sign out does not prove provider revocation | `lib/supabase.ts:33-41`; `SyncProvider.tsx:351-388` |

### Privacy reconciliation result

1. **Source and runtime behavior:** FAIL. The source sends AI content without explicit consent. Native image upload is broken, so behavior also differs by platform.
2. **Backend behavior:** NEEDS HUMAN ACTION. Schema and RLS definitions exist, but deployment, logs, backups, region, retention, and deletion were not verified.
3. **Third-party SDK and service behavior:** FAIL. OpenRouter and downstream provider settings are not fixed or recorded. Google offline access is broader than needed.
4. **Privacy manifests:** NEEDS HUMAN ACTION. Located manifests are syntactically valid, but there is no archive privacy report or Hermes verification.
5. **Privacy policy:** FAIL. No policy or in-app link exists.
6. **Proposed App Store privacy answers:** DRAFT. At minimum, plan to disclose Name, Email Address, User ID, Other User Content, Other Financial Info, and Product Interaction as linked data used for App Functionality or Product Personalization. Decide Photos or Videos and AI-transmitted financial content only after the final ZDR and provider design is verified. Current source shows no tracking.

Any mismatch among these six items blocks the privacy package.

## App Store Connect answer sheet

| Field | Proposed value | State | What closes it |
| --- | --- | --- | --- |
| App name | WouldYouIQ | Draft | Confirm trademark and name availability; limit is 30 characters |
| Subtitle | Priorities, made personal | Draft | Product approval; limit is 30 characters |
| Bundle ID | Owner-controlled reverse-DNS ID | Owner decision | Register before first upload and match the archive |
| Version | 1.0.0 | Verified in source | Confirm EAS remote version state |
| Build | 1 in source | Draft | Confirm EAS auto-incremented final build |
| Primary language | English (U.S.) | Draft | Owner confirmation |
| Primary category | Productivity | Draft | Owner confirmation |
| Secondary category | Finance | Draft | Owner confirmation; ensure listing does not imply regulated banking services |
| Made for Kids | No | Draft | Owner confirmation based on target audience |
| Age rating | Complete the updated 2026 questionnaire | Owner decision | App Store Connect evidence |
| Content rights | App contains licensed third-party fonts and code | Draft | License and asset-rights file |
| Description | Not drafted in this audit | Owner decision | Final feature set and accurate privacy language; maximum 4,000 characters |
| Keywords | Not drafted in this audit | Owner decision | Maximum 100 bytes; do not use competitor names |
| Support URL | Missing | Owner decision | Public page with actual contact information |
| Marketing URL | Optional, not provided | Owner decision | Public product page if desired |
| Privacy Policy URL | Missing | FAIL | Public policy matching final behavior |
| Privacy Choices URL | Missing | Draft | Public consent, export, and deletion help page |
| Copyright | `2026 <rights owner>` | Owner decision | Legal owner name |
| Price | Free for version 1 is recommended | Owner decision | Remove Pro offer or implement StoreKit |
| Availability | Not chosen | Owner decision | Storefront list and regional compliance |
| Tax category | Not chosen | Owner decision | App Store Connect selection |
| Release option | Manual release is recommended for version 1 | Draft | Owner confirmation |
| App privacy | Draft inventory above | FAIL | Reconcile code, vendors, policy, manifests, and answers |
| Accessibility | Do not claim support yet | Draft | Per-device common-task testing |
| Export compliance | Uses HTTPS/TLS and standard SDK cryptography | Draft | Account holder answers current questionnaire and confirms exemption |
| Regulated medical status | Not a medical app | Draft | Owner confirmation |
| DSA trader status | Unknown | Owner decision | Complete and verify if distributing in the EU |
| App Review contact | Missing | Owner decision | Name, email, and international-format phone number |
| Demo account | Missing | Owner decision | Non-expiring account or approved full demo mode |
| Review notes | Draft below | Draft | Update after final release candidate is tested |
| Screenshots | Missing | NEEDS HUMAN ACTION | Final release-build captures for iPhone and iPad |

## Draft review notes

Use these only after every blocker above is closed.

> WouldYouIQ is a local-first priority and budget-planning app. Users compare tasks in short calibration rounds, and the app ranks tasks based on those choices. Core task, budget, and calibration features work without an account. Optional account sign-in adds cloud sync through Supabase.
>
> To test the main flow, complete onboarding or choose the clean-start option, open Tasks to add at least four tasks, open Would You? to complete three comparisons, then open For You to view and complete the highest-ranked task. Open Budget to add income and expense items and view budget alignment.
>
> AI Magic is reached from the For You screen. Before the first AI request, the app explains that selected text or images will be sent to OpenRouter and a routed model provider and asks for explicit consent. The reviewer can decline and continue using all non-AI features. [Replace this paragraph with the tested final consent wording and provider facts.]
>
> Cloud sync is optional. Use the non-expiring review account supplied in App Review Information to test login, sync, sign-out, and account deletion. [Add exact credentials through App Store Connect, never this repository.] Account deletion is available under Settings > Account > Delete account and removes the Supabase Auth account and associated cloud records. [Verify this exact path after implementation.]
>
> Version 1 contains no advertising, tracking, in-app purchases, subscriptions, notifications, or public user-generated content.

## Screenshot shot list

Apple currently permits one to ten screenshots per device set and does not allow alpha transparency. Because this app supports iPad, both device families need coverage.

| Order | Device and size | Screen and state | Claim | Data and cleanup |
| --- | --- | --- | --- | --- |
| 1 | iPhone 6.9-inch portrait, use an accepted size such as 1320 by 2868 | Would You? with two realistic tasks | Fast pairwise priority calibration | Use fictional tasks; no personal content |
| 2 | iPhone 6.9-inch portrait | Ranked Tasks list after calibration | Priorities update from choices | No demo labels or placeholder rows |
| 3 | iPhone 6.9-inch portrait | For You priority card | One clear next action | Use polished sample data |
| 4 | iPhone 6.9-inch portrait | Budget overview | Income, expenses, and remaining budget | Use fictional rounded amounts |
| 5 | iPhone 6.9-inch portrait | AI Magic review screen after consent | Review before saving AI suggestions | No real statements, names, or account numbers |
| 1 | iPad 13-inch portrait, 2064 by 2752 or another currently accepted size | Would You? | iPad layout and main interaction | Verify no stretched phone layout |
| 2 | iPad 13-inch portrait | Tasks and ranking | Full task management | Fictional data |
| 3 | iPad 13-inch portrait | Budget overview | iPad budget layout | Fictional data |
| 4 | iPad 13-inch portrait | AI Magic review | AI import workflow | No sensitive content |

Capture from the final signed release candidate. Do not use the prototype PNG files under `ui_redesign/` as store screenshots.

## Export compliance guidance

The app uses HTTPS/TLS for Supabase, Google OAuth, and OpenRouter. Supabase PKCE and bundled libraries also use standard cryptographic functions. `app.json:23` currently asserts `ITSAppUsesNonExemptEncryption=false`, which can be correct when the app uses only exempt standard encryption, but source inspection is not enough to make the legal export answer.

The account holder must:

1. Inventory cryptography in the final archive and all SDKs.
2. Answer the current App Store Connect export questions using the final behavior and storefronts.
3. Confirm whether the app qualifies for an exemption and whether any annual or regional filing is needed.
4. Save the rationale and any uploaded documentation with the release record.

## Remediation plan

### Phase 0: Contain the exposed credential

1. Revoke the current OpenRouter key.
2. Review OpenRouter usage and billing for misuse.
3. Build a trusted AI proxy with authentication, quotas, payload limits, ZDR enforcement, and logs that do not contain statement content.
4. Replace the client request and prove no provider secret is present in a production export.

Exit evidence: rotated key, server deployment record, abuse controls, and a bundle scan showing the secret is absent.

### Phase 1: Lock the version 1 product

1. Remove WouldYouIQ Pro and every premium claim from version 1.
2. Decide whether AI Magic ships. If it cannot meet the privacy and native-quality requirements, remove it and test it through TestFlight instead.
3. Replace demo and experimental release wording.
4. Set the final display name, bundle ID, supported devices, and version source.

Exit evidence: approved feature list and a release configuration with no dead or hidden feature.

### Phase 2: Fix accounts and privacy

1. Add Sign in with Apple or remove Google login.
2. Remove unnecessary Google offline access.
3. Implement in-app account deletion and provider revocation.
4. Add AI disclosure, consent, and revocation.
5. Publish and link the privacy policy and privacy choices.
6. Finalize the privacy label from verified Supabase, Google, OpenRouter, and model-provider behavior.

Exit evidence: screen recordings and backend logs for login, consent, revocation, sign-out, and deletion; published policy; reconciled privacy inventory.

### Phase 3: Finish native behavior and accessibility

1. Implement the native image picker and failure handling.
2. Add accessibility semantics, non-gesture alternatives, Dynamic Type support, and reduced-motion behavior.
3. Update Expo patch versions and remediate dependency advisories.
4. Add integration tests for onboarding, task and budget persistence, OAuth callback handling, AI consent, deletion, and backend failures.

Exit evidence: passing `expo-doctor`, typecheck, unit and integration tests, accessibility test record, and physical-device results.

### Phase 4: Build and test the real release artifact

1. Create the signed archive with Xcode 26 or later and the iOS 26 SDK or later.
2. Inspect bundle ID, versions, architectures, icons, Info.plist, entitlements, code signatures, embedded frameworks, symbols, and privacy manifests.
3. Generate Xcode's privacy report. Verify the Hermes manifest and every required-reason API.
4. Validate with Xcode or App Store Connect and save every warning and error.
5. Test clean install, relaunch, background and foreground, offline and interrupted network, IPv6-only networking, permission denial, login, deletion, AI consent, and all core tasks.
6. Test iPhone and iPad, including iPad rotation and multitasking layouts.

Exit evidence: archive hash, validation output, privacy report, TestFlight build number, device matrix, and crash-free test logs.

### Phase 5: Complete App Store Connect

1. Finish agreements, tax, banking, app record, bundle ID, price, tax category, availability, and release option.
2. Complete the updated age-rating questionnaire, app privacy, accessibility, export, medical-status, content-rights, and DSA declarations.
3. Upload final screenshots and accurate metadata.
4. Add review contact, durable demo credentials, and tested review instructions.
5. Select the exact tested build and submit only after every `FAIL` is closed.

Exit evidence: App Store Connect export or screenshots for every required field and the selected validated build.

## Verification performed

- Inspected application configuration, EAS configuration, package manifests, source flows, local persistence, cloud sync, OAuth, AI requests, database migrations, and user-visible release content.
- Ran `npm run typecheck`: pass.
- Ran `npm test`: 5 passed, 0 failed. Node emitted a module-type warning.
- Ran current `expo-doctor`: 17 of 18 checks passed; six Expo patch mismatches failed the dependency-version check.
- Ran `npm audit --omit=dev`: 39 advisories, including 2 critical and 18 high.
- Ran `npx expo config --type public`: resolved iPhone and iPad support, version 1.0.0, build 1, and placeholder bundle ID.
- Generated a disposable iOS native project: prebuild passed; minimum iOS deployment target resolved to 15.1; target family resolved to iPhone and iPad; entitlements were empty.
- Could not run CocoaPods or Xcode build because `pod` is not installed.
- Ran `npx expo export --platform ios`: pass.
- Confirmed with a binary-safe search that the OpenRouter key and endpoint are in the Hermes bundle.
- Validated eight located dependency `PrivacyInfo.xcprivacy` files with `plutil`: all were syntactically valid.
- Checked the app icon: 1024 by 1024 and no alpha.
- Attempted anonymous production Supabase RLS reads. The audit environment could not resolve the project host, so no backend result is claimed.
- Refreshed Apple and vendor rules from live sources on 2026-09-03.

## Residual risks

- No signed archive, code-signing check, App Store validation, or archive privacy report exists.
- No iPhone or iPad runtime flow was exercised in this audit.
- No production backend, OAuth console, OpenRouter organization setting, App Store Connect record, or developer-account state was verified.
- No legal opinion is provided for privacy, export, trademark, content rights, DSA, or regional availability.
- Dependency advisories need reachability analysis after the Expo upgrade.
- The report cannot promise approval. Apple reviews the final binary, metadata, backend, and actual behavior.

## Live sources

Checked 2026-09-03:

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- [App information fields](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/)
- [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Accessibility Nutrition Labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels)
- [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection)
- [OpenRouter zero data retention](https://openrouter.ai/docs/guides/features/zdr)
- [OpenRouter privacy policy](https://openrouter.ai/privacy)
- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase user sessions](https://supabase.com/docs/guides/auth/sessions)

## Owner handoff in submission order

1. **Engineering and security:** Rotate the OpenRouter key, review usage, deploy the trusted AI proxy, and prove no secret remains in the iOS bundle.
2. **Product:** Freeze the version 1 feature set. Remove Pro and unfinished features, or finish every retained path.
3. **Engineering:** Add Sign in with Apple, remove unnecessary Google offline access, and implement complete account deletion and token revocation.
4. **Privacy owner:** Approve the AI consent, privacy policy, privacy choices, vendor settings, retention schedule, and App Store privacy answers.
5. **Engineering and QA:** Fix native image upload and accessibility, upgrade dependencies, add integration tests, and pass the physical-device matrix.
6. **Apple account owner:** Confirm membership, roles, agreements, tax, banking, bundle ID, certificates, identifiers, and App Store Connect app record.
7. **Release engineer:** Produce the signed archive with the current required Xcode and SDK, inspect it, generate the privacy report, and pass validation.
8. **Product and design:** Finalize name, subtitle, description, keywords, categories, support URL, privacy URL, copyright, price, availability, and release option.
9. **QA and design:** Capture final iPhone and iPad screenshots from the exact tested release build.
10. **Account holder and legal:** Complete age rating, export compliance, content rights, regulated-status, accessibility, DSA, and other regional declarations.
11. **Release owner:** Add the review contact, durable credentials, tested notes, and any attachments. Select the exact validated build.
12. **Account holder, Admin, or App Manager:** Add the version for review only when every `FAIL` in this report is closed and the evidence is stored with the release.
