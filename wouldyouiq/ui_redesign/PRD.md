# WouldYouIQ
## Product Requirements Document
**Version 4.0 · March 2026**

> Discover your real priorities through two-second choices.

---

## 1. Product Overview

WouldYouIQ is a mobile-first priority calibration app. It learns what users truly value through rapid pairwise comparisons ("Would you choose X over Y?") and builds a live ELO-ranked map of their priorities. The core insight is revealed preference: what you actually pick under pressure is more honest than any list you write.

This is not a task manager. It is a priority discovery game.

| Attribute | Detail |
|---|---|
| App name | WouldYouIQ |
| Platform | Mobile-first PWA (HTML/JS single file prototype → Next.js) |
| Current version | v10 — single-card swipe arena + subtask runner |
| Prototype file | `wouldyouiq-v10.html` (self-contained, ~2700 lines) |
| Infrastructure target | Vercel (Next.js) + Supabase + Stripe |
| Auth | Google Sign-In via Supabase OAuth |
| Monetisation | Freemium: Free tier / Pro $6.99/mo or $49/yr |

---

## 2. App Navigation

Five bottom-tab navigation. Active tab shows violet indicator dot and scaled icon.

| Tab | Icon | Description |
|---|---|---|
| Tasks | 📋 | Task list with List / Insights sub-tabs |
| Would You? | ⚡ | Pairwise calibration arena (main loop) |
| For You | ✨ | TikTok-style priority feed |
| Budget | 💰 | Budget Overview / Insights sub-tabs |
| Settings | ⚙️ | Profile, stats, preferences |

---

## 3. Would You? Arena (Calibration)

The core mechanic. Single-card Tinder-style swipe interface. One challenger card is shown at a time. The current champion (last winner) appears above as a compact gold pill with crown, emoji, name, and ELO.

### 3.1 Swipe Directions

| Direction | Action | Result |
|---|---|---|
| → Right | YES — challenger wins | Challenger flies right, becomes new champion. Crown pill updates with spring bounce animation. |
| ← Left | NO — champion holds | Challenger flies left with particle disintegration. Champion remains. |
| ↑ Up | Skip pair | Challenger arcs upward off screen. Fresh challenger loads. |
| ↓ Down | ⭐ Mark Essential | Star badge pops onto emoji (spring), card graduates upward off screen. Toast: "This task graduates — no more debates!" Item removed from calibration pool permanently. |

### 3.2 Challenger Card

- Large centered card, full-width (max 340px), dark gradient background
- Challenger emoji shown at 88px with continuous `idleWobble` CSS animation (rocks/breathes while user decides)
- Task name in Unbounded 900 22px, metadata (time/price) in secondary pill below
- Canvas overlay for particle disintegration on left-swipe rejection
- Directional hint overlays fade in as user drags: ✓ YES (green) / ✗ NO (red) / ↑ SKIP (grey) / ⭐ ESSENTIAL (gold)
- Bottom swipe guide strip shows four labeled directional icons

### 3.3 Champion Strip

- Hidden when no champion exists (first round)
- Compact gold pill: crown icon + emoji + name + ELO badge
- Animates in with `champCrown` keyframe (spring drop) when a new champion is crowned

### 3.4 ELO System

- All tasks and budget items have an `elo` field (default 1200) and `comps` counter
- Win: +16 ELO to winner, −16 ELO to loser
- Essential swipe: awards +30 XP, removes item from calibration pool (`task.ess = true`)
- Budget items show coloured ELO badge: green ≥1300, red ≤1100, violet otherwise
- Budget "calibrated" when ELO spread > 40 or total comparisons ≥ 4

### 3.5 Modes

- **Tasks mode:** compares undone, non-essential tasks by ELO uncertainty
- **Budget mode:** compares budget line items by value preference
- Mode toggle (Tasks / Budget) in top bar of the arena screen

### 3.6 Progress & Gamification

- 3-dot progress bar at top tracks swipes in current session (0–3)
- After 3 commits: Completion overlay (Priorities Updated! + XP + streak)
- Then every 5 commits after that: another completion trigger
- +20 XP per comparison, +75 XP on completion, +30 XP per essential mark
- Confetti burst + floating XP label on each commit

---

## 4. Task System

### 4.1 Task Data Model

| Field | Type | Description |
|---|---|---|
| `id` | number | Unique integer |
| `e` | string | Emoji icon |
| `n` | string | Task name |
| `t` | string | Time cost label (e.g. "45 min") |
| `elo` | number | ELO rating, default 1200 |
| `ess` | boolean | Essential flag — removes from calibration, pins to top |
| `dl` | `today \| this week \| null` | Deadline |
| `urg` | `high \| med \| low` | Urgency |
| `done` | boolean | Completion status |
| `subtasks` | `Subtask[]` | Ordered step list |

### 4.2 Task List UI

- Tap task row to expand/collapse (chevron indicator)
- Collapsed: emoji + name truncated at 16 chars, urgency/deadline badges
- Expanded: full name, subtask drawer with drag-reorder handles, checkboxes, inline edit, delete
- ▶️ Start Task button appears in drawer when subtasks exist
- Essential tasks shown with ⭐ badge

### 4.3 Subtask System

| Field | Type | Description |
|---|---|---|
| `id` | number | Unique integer |
| `n` | string | Subtask name |
| `done` | boolean | Completion status |

- `addSubtaskInline()` — inserts blank subtask and immediately focuses input
- `editSubtaskInline()` — replaces name span with input in-place; Enter/blur saves, Escape cancels
- `deleteSubtask()` — removes from array and re-renders
- Drag-handle (⠿) for reorder

### 4.4 Subtask Runner Screen

Launched by "Start" on FYP card or ▶️ in task drawer.

- Top bar: back arrow + step X/N progress pill
- Vertically centred content block:
  - Parent task badge (compact violet pill)
  - Dashed connector line (2px dashed, violet-tinted)
  - Current subtask: 60px 📌 emoji + Unbounded 26px title
  - "▼ Why this step?" expandable detail
  - Done / Skip action buttons in-flow (not absolute positioned)

### 4.5 Seed Tasks

| Task | ELO | Deadline | Urgency | Subtasks |
|---|---|---|---|---|
| 🏋️ Workout | 1420 | — | — | 4 |
| 📚 Study for Exam | 1380 | today | high | 3 |
| 💡 Work on Startup | 1350 | — | — | 0 |
| 📖 Read | 1310 | — | — | 0 |
| 🧘 Meditate | 1290 (essential) | — | — | 0 |
| 📧 Clear Inbox | 1240 | today | med | 3 |
| 🎸 Guitar Practice | 1200 | — | — | 0 |
| 🚶 Walk Outside | 1180 | — | — | 0 |

---

## 5. For You Page (FYP)

TikTok-style single-card priority feed. Shows the highest-ELO undone task. Swipe up to skip, tap Done or Start.

- Tasks with subtasks show ▶️ Start instead of ✅ Done
- Task name truncated at 16 chars in collapsed state
- "Tell me more ▼" expands to reveal full name and detail text
- Swipe handler shared with arena and runner screens (`addFYSwipe`)
- Two equal-width action buttons centered at bottom (min-width: 120px each)

---

## 6. Insights Feed

FYP-style insight card feed available in both Tasks (Insights sub-tab) and Budget (Insights sub-tab).

### 6.1 Task Insight Types

| Type | Trigger |
|---|---|
| Neglected Priority | High-ELO task with no deadline |
| Essential Gap | High urgency task not marked essential |
| Focus Drift | Many low-ELO tasks done, high-ELO neglected |

### 6.2 Budget Insight Types

| Type | Trigger |
|---|---|
| Overspend | Flex item consuming disproportionate budget share |
| Savings Gap | No savings category or under-allocated |
| Underinvesting | High-ELO items with low budget allocation |
| Low-Value Spend | Items with many comparisons and consistently low ELO |

### 6.3 Insight Card Layout

- 72px hero emoji (task emoji for task insights, category icon for budget)
- Type badge pill (e.g. "Neglected Priority")
- Unbounded 900 21px headline (🔴 red circle prefix for neglected task titles)
- Subtitle text
- "▼ Why this matters" expandable detail
- Two in-flow action buttons (Act on This / Skip) — not absolute positioned
- `actOnInsight()` creates a task with `ess:true`, `dl:'today'`, `urg:'high'`

---

## 7. Budget

### 7.1 Budget Item Model

| Field | Type | Description |
|---|---|---|
| `id` | number | Unique integer |
| `e` | string | Emoji icon |
| `n` | string | Item name |
| `amt` | number | Monthly amount ($) |
| `type` | `ess \| flex` | Essential vs flexible |
| `ess` | boolean | Essential flag |
| `elo` | number | ELO rating, default 1200 |
| `comps` | number | Comparison count |

### 7.2 Budget Overview

- Donut chart of spending by category with centre % label
- Income card with edit button
- Leftover / Save card (green if positive, red if over budget)
- Legend rows: category · percentage · dollar amount
- Full item list below with ELO badges coloured by rank

### 7.3 Seed Budget Data

| Item | Amount | Type | ELO |
|---|---|---|---|
| 🏠 Rent | $1,400 | Essential | — |
| ⚡ Electricity | $90 | Essential | — |
| 🛒 Groceries | $380 | Essential | — |
| 💪 Gym | $45 | Flex | 1340 |
| 🎵 Spotify | $10 | Flex | 1280 |
| 🛵 DoorDash | $210 | Flex | 1120 |
| 📺 Streaming | $28 | Flex | 1200 |
| 💚 Saved | $2,037 | Essential | — |

---

## 8. Completion Overlay

Appears after 3 swipes (daily goal) and every 5 commits thereafter.

- Full-screen overlay: `position:fixed`, `z-index:9999`, placed outside `.app` div in DOM to avoid `overflow:hidden` clipping
- `display:none` by default (not just `opacity:0`) — switches to `display:flex` on `.on`
- No `backdrop-filter` (causes stacking context issues in mobile WebKit)
- Animated in sequence: badge → title → subtitle → XP pill → streak pill → CTA buttons
- Two CTAs: "Keep Swiping ⚡" (returns to arena) and "My Priorities →" (goes to FYP)
- +75 XP awarded, streak incremented, confetti burst ×2

---

## 9. Gamification & XP

| Action | XP | Notes |
|---|---|---|
| Comparison (swipe left or right) | +20 | Per commit |
| Mark Essential (swipe down) | +30 | Also graduates item from pool |
| Completion milestone | +75 | Every 3rd then every 5th commit |
| Task done | +15 | On FYP or runner completion |

- XP pills float up from interaction point
- Streak tracked in `U.streak`, shown in settings and completion overlay
- Total comparisons tracked in `U.comparisons`

---

## 10. Design System

### 10.1 Typography

| Role | Font | Weight |
|---|---|---|
| Display / hero text | Unbounded | 900 |
| Body / labels / buttons | Figtree | 400–800 |

### 10.2 Colour Palette

| Variable | Hex | Usage |
|---|---|---|
| `--bg` | `#07070d` | App background |
| `--s1` | `#0e0e1c` | Surface 1 |
| `--s2` | `#15152a` | Surface 2 (cards, inputs) |
| `--s3` | `#1c1c38` | Surface 3 (progress tracks) |
| `--v` | `#a78bfa` | Primary violet (active states) |
| `--v2` | `#7c6af7` | Violet mid |
| `--v3` | `#6254e0` | Violet deep (buttons, gradients) |
| `--gold` | `#f5c842` | Gold (champion, streaks, essential) |
| `--gold2` | `#ff9f43` | Gold warm (streak fire) |
| `--green` | `#34d399` | Success, yes-swipe |
| `--green2` | `#10b981` | Green deep |
| `--red` | `#f87171` | Reject, no-swipe |
| `--cyan` | `#22d3ee` | Accent |
| `--blue` | `#3b82f6` | Option B colour |
| `--tx` | `#f1f0f8` | Primary text |
| `--t2` | `#9490b5` | Secondary text |
| `--t3` | `#4e4a6a` | Tertiary / labels |

### 10.3 Motion

| Type | Easing | Duration |
|---|---|---|
| Spring entry (pops, badges) | `cubic-bezier(.34,1.56,.64,1)` | 300–500ms |
| Exit (card fly-offs) | `cubic-bezier(.55,0,.2,1)` | 280–400ms |
| Idle wobble (challenger emoji) | `ease-in-out infinite` | 2.4s loop |
| Ambient orbs | `ease-in-out alternate` | 10–15s loop |

Three ambient gradient orbs drift behind all content: violet (top-left), gold (bottom-right), cyan (mid-left).

---

## 11. Infrastructure (Target)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js | Deployed on Vercel |
| Database | Supabase (Postgres) | Row Level Security enabled |
| Auth | Supabase OAuth | Google Sign-In, 14-day Pro trial |
| Payments | Stripe | $6.99/mo or $49/yr |
| Hosting | Vercel | Auto-deploy from GitHub |

### 11.1 Supabase Schema

```sql
users         (id, name, xp, streak, comparisons)
tasks         (id, user_id, emoji, name, time_cost, elo, essential, deadline, urgency, done)
subtasks      (id, task_id, name, done, position)
budget_items  (id, user_id, emoji, name, amount, type, essential, elo, comps)
comparisons   (id, user_id, item_a, item_b, winner, mode, created_at)
```

### 11.2 Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Tasks | 10 | Unlimited |
| Budget items | 5 | Unlimited |
| Insight cards | 3 | Unlimited |
| Subtask runner | ✓ | ✓ |
| Export priorities | — | ✓ |
| Streak history | 7 days | Full history |
| Price | Free | $6.99/mo or $49/yr |

---

## 12. Current Implementation Status

### 12.1 Completed (v10)

- [x] Single-card Tinder swipe arena with champion/challenger model
- [x] 4-direction swipe: right=yes, left=no, up=skip, down=essential
- [x] Idle wobble animation on challenger emoji
- [x] Champion pill with crown-drop spring animation
- [x] Essential graduation: star badge pop + card flies off screen upward
- [x] ELO system for tasks and budget items
- [x] Task expand/collapse with subtask drawer (inline add/edit/delete/reorder)
- [x] Subtask runner screen (in-flow centred layout)
- [x] For You Page (FYP) with Start vs Done based on subtasks
- [x] FYP-style insight feed for both tasks and budget
- [x] Budget donut chart with legend and item list
- [x] 5-tab navigation with progress indicators
- [x] Completion overlay (fixed outside `.app`, `z-index:9999`, no `backdrop-filter`)
- [x] Undo completion dialog (fixed outside `.app`)
- [x] Gamification: XP, streaks, confetti, floating XP labels
- [x] Settings tab with profile and stats
- [x] Separate `styles.css`, `app.js`, `index.html` files

### 12.2 Pending

- [ ] Persist state (localStorage → Supabase sync)
- [ ] Google Sign-In via Supabase OAuth
- [ ] Stripe payments integration
- [ ] Onboarding flow improvements
- [ ] Task and budget item description/notes fields
- [ ] "Still calibrating" state for low-comps items in insights
- [ ] Skipped insights resurface after N more comparisons
- [ ] Vercel deployment

---

## 13. Key Files

| File | Description |
|---|---|
| `wouldyouiq-v10.html` | Self-contained prototype, works in any browser |
| `index.html` | Shell HTML referencing external CSS and JS |
| `styles.css` | All styles (~570 lines) |
| `app.js` | All JavaScript (~1950 lines) |
| `WouldYouIQ-PRD-v4.md` | This document |
| `WouldYouIQ-PRD-v4.docx` | Word version of this document |

---

*WouldYouIQ · PRD v4.0 · March 2026 · Confidential*