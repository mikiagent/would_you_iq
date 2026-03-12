# WouldYouIQ — Technical Implementation Plan
**Version:** 2.0  
**Last Updated:** March 2026  
**Reference:** PRD v3.0

---

## Overview

This document is the step-by-step engineering plan for building WouldYouIQ as a React Native + Expo mobile app. It reflects the full feature set as of PRD v3, including: 5-tab navigation, live-drag "Would You?" swipe mechanic, essential item system, onboarding flow, edit system, budget pie chart, and Insights tab.

---

## Phase 0 — Project Setup (Days 1–3)

### 0.1 Expo Project Init
```bash
npx create-expo-app@latest wouldyouiq --template tabs
cd wouldyouiq
npx expo install expo-router react-native-reanimated react-native-gesture-handler
npx expo install expo-haptics @shopify/flash-list
npx expo install mmkv zustand
```

### 0.2 Supabase Project
- Create project at supabase.com
- Enable Email Auth
- Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

### 0.3 Design Tokens (`constants/tokens.ts`)
```typescript
export const Colors = {
  bg: '#07070d',
  s1: '#0f0f1a',
  s2: '#17172a',
  s3: '#1e1e35',
  violet: '#a78bfa',
  v2: '#7c6af7',
  gold: '#f5c842',
  green: '#34d399',
  red: '#f87171',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  redB: '#ef4444',
  t1: '#f1f0f8',
  t2: '#9490b5',
  t3: '#4e4a6a',
};

export const Fonts = {
  display: 'Unbounded_900Black',
  bodyBold: 'Figtree_800ExtraBold',
  body: 'Figtree_600SemiBold',
  bodyLight: 'Figtree_400Regular',
};
```

### 0.4 Base Components
- `<Surface>` — dark card container with border
- `<Badge>` — pill with color variants
- `<EssentialStar>` — animated toggle (gray→gold with scale bounce)
- `<BottomSheet>` — reusable slide-up modal
- `<EmojiPicker>` — 4×5 grid of emoji choices
- `<Toggle>` — on/off switch for sheets

---

## Phase 1 — Data Layer (Days 4–10)

### 1.1 Database Schema (Supabase)

```sql
-- profiles
create table profiles (
  id uuid primary key references auth.users,
  name text,
  xp integer default 0,
  streak integer default 0,
  streak_last_date date,
  comparisons_total integer default 0,
  tasks_completed integer default 0,
  monthly_income numeric default 0,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  emoji text not null,
  name text not null,
  time_estimate text,
  elo integer default 1200,
  essential boolean default false,
  deadline text,  -- 'today' | 'this week' | null
  urgency text default 'low',
  done boolean default false,
  done_at timestamptz,
  created_at timestamptz default now()
);

-- comparisons
create table comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  winner_id uuid references tasks,
  loser_id uuid references tasks,
  session_date date,
  created_at timestamptz default now()
);

-- budget_items
create table budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  emoji text not null,
  name text not null,
  amount_monthly numeric not null,
  type text default 'flex',  -- 'essential' | 'flex'
  essential boolean default false,
  created_at timestamptz default now()
);

-- daily_sessions
create table daily_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  session_date date,
  comparisons_completed integer default 0,
  xp_earned integer default 0,
  completed boolean default false
);
```

### 1.2 Elo Engine (`utils/elo.ts`)
```typescript
export const K = 16;

export function eloUpdate(winnerElo: number, loserElo: number) {
  const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return {
    winner: Math.round(winnerElo + K * (1 - expected)),
    loser: Math.round(loserElo - K * (1 - expected)),
  };
}
```

### 1.3 Task Sort (`utils/sort.ts`)
```typescript
export function sortTasks(tasks: Task[], activeOnly = true): Task[] {
  const pool = activeOnly ? tasks.filter(t => !t.done) : tasks;
  return [...pool].sort((a, b) => {
    // 1. Essentials always first
    if (a.essential && !b.essential) return -1;
    if (!a.essential && b.essential) return 1;
    // 2. Urgency
    const urgencyWeight = { high: 3, med: 2, low: 0 };
    const urgDiff = (urgencyWeight[b.urgency] ?? 0) - (urgencyWeight[a.urgency] ?? 0);
    if (urgDiff !== 0) return urgDiff;
    // 3. Elo
    return b.elo - a.elo;
  });
}
```

### 1.4 Zustand Stores

**`stores/taskStore.ts`**
```typescript
interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'elo' | 'done' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleEssential: (id: string) => void;  // key action
  applyEloUpdate: (winnerId: string, loserId: string) => void;
  markDone: (id: string) => void;
  getPairPool: () => Task[];  // non-essential, non-done only
}
```

**`stores/budgetStore.ts`**
```typescript
interface BudgetStore {
  income: number;
  items: BudgetItem[];
  setIncome: (amount: number) => void;
  addItem: (item: Omit<BudgetItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<BudgetItem>) => void;
  deleteItem: (id: string) => void;
  toggleEssential: (id: string) => void;
  getTotalSpend: () => number;
  getLeftover: () => number;
  getAlignmentScore: () => number;
}
```

**`stores/userStore.ts`**
```typescript
interface UserStore {
  profile: UserProfile;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
  incrementComparisons: () => void;
  incrementTasksDone: () => void;
  setOnboardingComplete: () => void;
}
```

### 1.5 MMKV Persistence
Persist all three stores to MMKV using `zustand/middleware` `persist` with a custom MMKV storage adapter.

---

## Phase 2 — Onboarding (Days 11–16)

### 2.1 Flow
3-step flow gated by `onboardingComplete` flag in userStore. If false, renders `OnboardingScreen` over everything.

**Step 0 — Welcome + Name**
- Logo + tagline
- Single `TextInput` for name
- "Let's go →" CTA

**Step 1 — Pick Priorities**
- 12-chip grid (`OB_TASKS` constant array)
- Minimum 4 selections enforced
- Progress dots (3 total)

**Step 2 — Mini Tournament**
- 3 rounds of side-by-side card taps
- Simpler than full drag — just tap the card you'd do first
- Progress dots animate through 3 states
- After 3 rounds: transition to DNA reveal

**Step 3 — DNA Reveal**
- Top 3 tasks shown with 🥇🥈🥉 and emoji
- Full confetti cannon via `ConfettiCannon` component
- "Start Using WouldYouIQ →" calls `setOnboardingComplete()` and navigates to `(tabs)/cal`

### 2.2 Seed Tasks
```typescript
const OB_TASKS = [
  { emoji: '🏋️', name: 'Exercise' },
  { emoji: '📚', name: 'Study/Learn' },
  { emoji: '💻', name: 'Side Project' },
  { emoji: '📖', name: 'Read' },
  { emoji: '🧘', name: 'Meditate' },
  { emoji: '✉️', name: 'Clear Inbox' },
  { emoji: '💰', name: 'Finances' },
  { emoji: '🎸', name: 'Creative Hobby' },
  { emoji: '🌿', name: 'Get Outside' },
  { emoji: '👨‍👩‍👧', name: 'Family/Friends' },
  { emoji: '🍳', name: 'Cook at Home' },
  { emoji: '💤', name: 'Sleep Early' },
];
```
Selected tasks are pushed to taskStore with `elo: 1200`. Tournament results then apply `eloUpdate()` to establish initial ranking.

---

## Phase 3 — "Would You?" Screen (Days 17–26)

### 3.1 Component: `TwoCardArena`

**Layout:**
- `flex: 1` column with `gap: 8`
- Top card (Challenger): `flex: 0 0 37%`, red theme
- VS row divider with chip label
- Bottom card (Defender): `flex: 0 0 47%`, blue theme
- `touch-action: none` on arena container

**Card anatomy:**
```
[Card]
  ├── <Canvas /> — disintegration particle layer (opacity: 0 default)
  ├── <CrownOverlay /> — 👑 emoji, opacity: 0 default
  ├── .vc-left
  │   ├── role badge (⚔️ Challenger / 👑 Defending)
  │   ├── emoji (44px challenger / 60px defender)
  │   ├── task name
  │   └── meta row (time + ELO badge)
  └── <EssentialStar /> — top-right corner, tappable
```

### 3.2 Drag System (React Native)

Use `react-native-gesture-handler` `PanGestureHandler`:

```typescript
const translateX = useSharedValue(0); // tracks drag progress

const onGestureEvent = useAnimatedGestureHandler({
  onStart: (_, ctx) => { ctx.startX = translateX.value; initParticles(); },
  onActive: (event, ctx) => {
    const progress = Math.max(-1, Math.min(1, event.translationX / (SCREEN_W * THRESH)));
    translateX.value = progress;
    // applyDragState(progress) — drives all animated values
  },
  onEnd: (event) => {
    const p = translateX.value;
    if (Math.abs(p) >= 0.85) commitDecision(p > 0 ? 'defender' : 'challenger');
    else if (Math.abs(p) > 0.5) snapToCommit(p > 0);
    else snapBack();
  },
});
```

**Animated values driven by `translateX`:**
```
winnerX   = interpolate(|p|, [0,1], [0, 28])   // winner shifts right
loserX    = interpolate(|p|, [0,1], [0,-22])    // loser shifts left
winScale  = interpolate(|p|, [0,1], [1, 1.045])
loseScale = interpolate(|p|, [0,1], [1, 0.935])
crownY    = interpolate(|p|, [0,1], [-28, 0])   // crown drops in
crownOp   = interpolate(|p|, [0,1], [0, 1])
loseGray  = interpolate(|p|, [0,1], [0, 0.75])
loseBright= interpolate(|p|, [0,1], [1, 0.56])
particleP = interpolate(|p|, [0,1], [0, 1])     // drives particle spread
```

**Which card gets crown vs disintegrate:**
- `p > 0` (right swipe) → **Defender (bottom/blue) wins** → crown on bot, disintegrate on top
- `p < 0` (left swipe) → **Challenger (top/red) wins** → crown on top, disintegrate on bot
- These are **always on opposite cards**

### 3.3 Pair Selection (`utils/pairs.ts`)
```typescript
export function selectPair(tasks: Task[], sessionPairs: string[][]): [Task, Task] {
  const pool = tasks.filter(t => !t.essential && !t.done);
  // Weight toward tasks with fewer comparisons
  // Exclude pairs already used in this session
  // Return [challenger, defender] tuple
}
```

### 3.4 Essential Toggle in Arena
Tapping ⭐ on a card mid-session:
1. Sets `task.essential = true`
2. Removes task from pair pool
3. Immediately calls `newPair()` to replace current pairing
4. Confetti mini-burst at tap location

---

## Phase 4 — Tasks Screen (Days 27–31)

### 4.1 Filter Bar
```typescript
type FilterMode = 'all' | 'essential' | 'deadline' | 'done';
```
Horizontal ScrollView of filter chips. Active chip = violet fill.

### 4.2 Task List Item (`TaskRow`)
Props: `task`, `rank`, `onToggleEssential`, `onEdit`

Visual states:
- Default: dark surface card
- Essential: gold left-border (3px), gold background tint
- Done: dimmed with ✅ badge

Rank display:
- Rank 1–3: 🥇🥈🥉
- Essential (any rank): ⭐
- Others: numeric

### 4.3 FAB → Add Task Sheet
Bottom sheet with:
- Emoji picker (4×5 grid, `ScrollView` or `FlatList`)
- TextInput: Task name
- TextInput: Time estimate
- Select: Deadline (None / Today / This week)
- Toggle: Essential
- Save / Cancel buttons

---

## Phase 5 — For You Screen (Days 32–38)

### 5.1 Card Stack
Single card visible at a time. `PanGestureHandler` on Y axis.

Swipe up threshold: `-80px` → calls `skipTask()`

Done button: `markDone(task.id)` → confetti + green flash + navigate to next

### 5.2 Sort Integration
Uses `sortTasks()` from Phase 1. Essentials always appear first.

### 5.3 Urgency Theming
Background glow color varies by urgency:
- `high`: `rgba(248,113,113,.08)` — warm red
- `med`: `rgba(245,200,66,.07)` — amber
- `low`: `rgba(167,139,250,.06)` — violet

---

## Phase 6 — Budget Screen (Days 39–46)

### 6.1 Income Edit
Inline "Edit" text link next to income display. Tap → bottom sheet with number input.

### 6.2 Pie Chart (`BudgetPieChart`)
96×96 canvas-rendered donut chart:
- Segment 1: Essentials total — violet `#a78bfa`
- Segment 2: Flexible total — gold `#f5c842`  
- Segment 3: Saved (income − total spend, min 0) — green `#34d399`
- Donut hole: filled with `--s1` color
- Center label: `Math.round(totalSpend/income * 100)%` + "spent"

Legend (right of chart): emoji dot + label + dollar amount per segment.

### 6.3 Leftover Card
```
┌─────────────────────────────┐
│ Remaining / Save Budget      │   $1,032
│ Surplus after expenses       │   (green if ≥0, red if <0)
└─────────────────────────────┘
```

### 6.4 Alignment Score Computation
Spearman rank correlation between:
- Task Elo ranks (non-essential only)
- Spend ranks (flexible items only, non-essential)

Map correlation (-1 to +1) to (0–100%). Display as progress bar.

### 6.5 Flagging Logic
Flag a flexible budget item if:
- `!item.essential`
- `item.amountMonthly / income > 0.05`

Flagged items: red border, ⚠️ note with percentage.

---

## Phase 7 — Insights Screen (Days 47–52)

### 7.1 Priority Ranking List
Full sorted task list using `sortTasks()` (including done tasks, for full picture). Per item:
- Medal or ⭐ or number for rank
- Emoji + name
- Elo badge
- Proportional bar (width = (elo - minElo) / (maxElo - minElo) * 100%)

### 7.2 Stats Grid (2×2)
- ⚡ Total XP
- 🔥 Streak (days)
- 🧩 Total Comparisons
- ✅ Tasks Done

### 7.3 Behavioral Insight Cards
Generate 3 insights from data:
1. **Top priority call-out:** "Your #1 priority is [task]. Make sure your schedule reflects it."
2. **Spend vs priority conflict** (if exists): "You're spending $X/mo on [Y] but it ranks low in your priorities."
3. **Comparison progress:** "You've made N comparisons. Your Elo ratings are becoming more accurate."

---

## Phase 8 — Edit System (Days 53–57)

### 8.1 `<BottomSheet>` Component
- Slides up from bottom using `react-native-reanimated`
- Blurred semi-transparent backdrop (`@react-native-community/blur`)
- Drag handle bar at top
- `onClose` callback
- `KeyboardAvoidingView` wrapper for inputs

### 8.2 `<EmojiPicker>` Component
- 4×5 grid of 20 emoji options
- Selected emoji: violet border + scale(1.2)
- `onSelect` callback

### 8.3 Delete Confirmation
For task/expense delete: show a red "Delete" button in the sheet. Single tap = delete (no second confirm). The simplicity is intentional — tasks are lightweight.

---

## Phase 9 — Polish & Launch Prep (Days 58–66)

### 9.1 Performance Targets
- App cold start: < 1.5s
- Swipe gesture: 60fps (Reanimated runs on UI thread)
- Screen transitions: < 200ms
- Elo update: synchronous (< 1ms)
- Supabase sync: background, non-blocking

### 9.2 Push Notifications
- Daily calibration reminder (user-chosen time, default 9am)
- Weekly Priority Report (Sunday 8am)
- Streak at-risk warning (if not calibrated by 8pm)

### 9.3 App Store Prep
- iOS: Xcode, App Store Connect, screenshots at 6.7"
- Android: Google Play Console, AAB build
- Privacy policy URL required (Supabase data handling)
- App Store category: Productivity

### 9.4 Analytics Events
```typescript
track('calibration_completed', { comparisons: 3, xp_earned: 95 });
track('task_done', { task_id, rank_at_completion });
track('essential_toggled', { task_id, direction: 'on' | 'off' });
track('onboarding_completed', { tasks_selected: number, name_entered: boolean });
track('budget_item_added', { type: 'essential' | 'flex', amount });
```

---

## Appendix — Prototype File Reference

| File | Description |
|---|---|
| `wouldyouiq-v4.html` | Last stable HTML prototype — vertical stacked cards, live drag |
| `wouldyouiq-v5.html` | Current prototype — 5-tab nav, onboarding, edit system, pie chart, essential system |
| `PRD-v3.md` | This document's companion spec |

---

## Appendix — Component Tree

```
App
├── OnboardingScreen (shown if !onboardingComplete)
│   ├── StepName
│   ├── StepPickTasks
│   ├── StepMiniTournament
│   └── StepDNAReveal
└── (tabs) — 5-tab Expo Router layout
    ├── tasks/index.tsx
    │   ├── FilterBar
    │   ├── TaskList (FlashList)
    │   │   └── TaskRow (× n)
    │   └── FAB → AddTaskSheet
    ├── cal/index.tsx
    │   ├── TopBar (logo + XP pill)
    │   ├── ProgressBar (3 dots + streak)
    │   ├── TwoCardArena
    │   │   ├── ChallengerCard (top, red)
    │   │   │   ├── ParticleCanvas
    │   │   │   ├── CrownOverlay
    │   │   │   └── EssentialStar
    │   │   ├── VSDivider
    │   │   └── DefenderCard (bottom, blue)
    │   │       ├── ParticleCanvas
    │   │       ├── CrownOverlay
    │   │       └── EssentialStar
    │   ├── SwipeGuide
    │   └── CompletionOverlay
    ├── fy/index.tsx
    │   ├── FYCard (full screen)
    │   └── SwipeHint
    ├── budget/index.tsx
    │   ├── IncomeRow
    │   ├── LeftoverCard
    │   ├── BudgetPieChart (canvas)
    │   ├── BudgetSection (Essentials)
    │   │   └── BudgetItem (× n)
    │   └── BudgetSection (Flexible)
    │       └── BudgetItem (× n)
    └── insights/index.tsx
        ├── GreetingHero
        ├── PriorityRankList
        ├── StatsGrid
        └── InsightCards (× 3)
```