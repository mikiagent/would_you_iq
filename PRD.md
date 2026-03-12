# WouldYouIQ — Product Requirements Document
**Version:** 3.0  
**Status:** In Development  
**Last Updated:** March 2026

---

## 1. Vision & Problem Statement

### The Problem
People are fundamentally bad at abstract prioritization. When forced to rank tasks, goals, or spending from scratch, most experience decision fatigue and either procrastinate or default to whatever feels easiest in the moment. This leads to:

- Overloaded task lists with no meaningful order
- A mismatch between stated values and actual time/money allocation
- Productivity apps abandoned because they require too much manual organization

### The Insight
Humans are significantly better at *relative* decisions than *absolute* ones. It is hard to answer "rank these 10 things." It is easy to answer "which of these two would you do first?" This is the foundation of **WouldYouIQ**.

### The Solution
WouldYouIQ learns your real priorities through repeated pairwise "Which would you do first?" comparisons. Instead of asking users to manage their priorities, it *observes* them through choices and builds a continuously improving priority model. This is inspired by **revealed preference theory** in economics — people's true priorities are better revealed through behavior than through self-reporting.

### North Star Metric
Daily Active Users completing their 3-comparison calibration session.

---

## 2. Target Users

**Primary:** Ambitious 22–38 year olds who feel productive-but-scattered. They have tasks, goals, and habits they care about but struggle to act on what matters most. They use apps like Todoist, Notion, and Duolingo but often abandon them.

**Secondary:** Financially-conscious users who sense a mismatch between their spending and their values but haven't quantified it.

---

## 3. Core Mechanics

### 3.1 The Elo Rating System
Every task and habit in the system has a hidden **Elo rating** (starting at 1200). Every pairwise comparison is treated as a match:

- Winner gains +16 Elo points
- Loser loses -16 Elo points
- After sufficient comparisons, Elo rankings converge on a stable, accurate priority order
- Contradictions (A > B, B > C, but C > A) are handled gracefully — Elo accounts for variance

**Essential items are excluded from Elo comparisons entirely.** They are pinned automatically to the top of all ranked views with a ⭐ marker.

### 3.2 The Essential System
Any task or budget item can be marked **Essential**. Essential status means:

- **Tasks:** Excluded from the "Would You?" comparison pool. Always ranked #1 (above all Elo-ranked tasks). Shown at the top of Tasks, For You, and Insights views.
- **Budget Items:** Excluded from alignment flagging. Not surfaced as "misaligned" regardless of amount. Shown with a ⭐ badge and "Essential — excluded from ranking" note.
- User can toggle essential on/off from the task card, the task list, the "Would You?" arena, or from the edit sheet.

### 3.3 The Daily Calibration Loop ("Would You?")
Each day, the user completes exactly **3 pairwise comparisons**. Each comparison:
1. Presents two tasks in a vertical stacked layout — **Challenger (red) on top, Defender (blue) on bottom**
2. Asks: *"Which would you do first?"* via swipe direction
3. **Swipe right = Defender (bottom/blue) wins. Swipe left = Challenger (top/red) wins.**
4. Elo updates immediately; only non-essential tasks enter the comparison pool

**Live Drag Animation:**
- As the user drags, cards respond in real time — no "tap to pick" mechanic
- **Winner card shifts right** and scales up slightly; a 👑 crown drops in proportional to drag distance
- **Loser card shifts left**, shrinks, desaturates, and colored particles **disintegrate** off it in real time
- Crown appears on the winner card; disintegration appears on the loser card (these are always on opposite cards)
- Release past 50% → snap to commit; release before 50% → snap back to neutral

### 3.4 The Onboarding Flow
3-step onboarding before any other screen:

**Step 1 — Name:** Simple "What's your name?" text input. Sets a personalized greeting throughout the app.

**Step 2 — Pick Priorities:** A chip-selection grid of 12 common priority types (🏋️ Exercise, 📚 Study/Learn, etc.). User selects at least 4. These seed the task list.

**Step 3 — Mini Tournament:** 3 quick side-by-side taps (not swipe — simpler for onboarding) comparing the selected tasks. Establishes a baseline Elo ranking.

**DNA Reveal:** After the tournament, a "Your Priority DNA" card shows the top 3 ranked tasks. Full confetti burst. CTA: "Start Using WouldYouIQ →" takes the user to the "Would You?" tab.

### 3.5 The "For You" Feed
After calibration, tasks are surfaced one at a time in priority order:

**Sort logic:**
1. Essential tasks first (regardless of Elo)
2. Deadline = today (urgency: high)
3. Deadline = this week (urgency: med)
4. Remaining, sorted by Elo descending

Actions: ✅ Mark Done, ⏭ Skip  
Swipe up = skip to next  
Completing a task: confetti burst, +30 XP, green flash overlay

### 3.6 The Budget Alignment Layer
- User inputs monthly income (editable via ✏️ button)
- Monthly expense items are user-managed (add/edit/delete via FAB and ✏️ buttons)
- **Pie chart** shows three segments: Essentials (violet), Flexible (gold), Saved/Surplus (green)
- Center of donut shows % of income spent
- Legend shows dollar amounts per category
- **Leftover card** prominently shows remaining amount labeled as "Remaining / Save Budget" in green (or red if over)
- Priority Alignment Score (0–100%) based on correlation between Elo ranking and spend ranking
- Flagged items: flexible items consuming >5% of income that aren't marked Essential
- Essential budget items show "⭐ Essential — excluded from ranking" note
- User can toggle essential status directly from the budget list

---

## 4. App Structure — 5-Tab Navigation

| Tab | Icon | Description |
|---|---|---|
| Tasks | 📋 | Full task list with filters, add/edit, essential toggle |
| Would You? | ⚡ | Daily pairwise calibration (was "Calibrate") |
| For You | ✨ | TikTok-style priority feed |
| Budget | 💰 | Income, expenses, pie chart, alignment |
| Insights | 🧠 | Priority ranking, stats, behavioral insights |

### 4.1 Tasks Screen
- Sticky filter bar: All | ⭐ Essential | 📅 Due Soon | ✅ Done
- Tasks sorted: essential first, then by Elo descending
- Each task shows: rank medal (🥇🥈🥉 for top 3), emoji, name, Elo badge, deadline badge if set
- Essential tasks show a gold left-border accent and ⭐ rank marker
- Inline ⭐ toggle (essential) and ✏️ edit button per task
- FAB (+) opens Add Task sheet

### 4.2 Would You? Screen
- Vertical stacked cards: Challenger (top, red, smaller) vs Defender (bottom, blue, larger)
- Defender is ~48% of the arena height; Challenger ~37%
- 3-dot progress bar with connecting fill lines
- Streak pip (🔥 N days)
- ⭐ essential toggle on each card (tapping marks that task essential and removes it from future pairings)
- Swipe guide labels: "👈 Challenger wins" / "Defender wins 👉"
- Only non-essential tasks appear in pairings

### 4.3 For You Screen
- Full-screen single task card
- Rank bar: "#N Priority" + ELO tag (+ ⭐ if essential)
- Urgency badge if deadline = today
- Swipe up to skip; Done/Skip action buttons

### 4.4 Budget Screen
- Header: "Budget 💰"
- Income row with inline "Edit" link
- Leftover/save card (green or red)
- Pie chart donut (96×96px canvas, three segments)
- Sections: 🏠 Essentials / 🎯 Flexible
- Per-item: emoji, name, amount, ⭐ essential toggle, ✏️ edit button
- Flagged flexible items: red border + "⚠️ N% of income" note
- FAB (+) opens Add Expense sheet

### 4.5 Insights Screen
- Personalized greeting: "Hey [Name]!"
- Full ranked priority list (essential items at top with ⭐, then Elo order)
- Per-task: rank number/medal, emoji, name, Elo, proportional bar
- Stats grid (2×2): Total XP, Day Streak, Total Comparisons, Tasks Done
- Behavioral insight cards (3 narrative observations derived from the data)

---

## 5. Edit System

All editing uses a bottom sheet modal with a handle and blurred backdrop.

### 5.1 Add/Edit Task Sheet
Fields: Emoji picker (grid of 20 emoji), Task Name (text), Time Estimate (text), Deadline (select: None / Today / This week), Essential toggle

Actions: Save / Cancel / Delete (edit mode only)

### 5.2 Add/Edit Expense Sheet
Fields: Emoji picker, Name (text), Monthly Amount (number), Type (select: Essential / Flexible), Essential toggle

Actions: Save / Cancel / Delete (edit mode only)

### 5.3 Edit Income
Single number input for monthly income. Save / Cancel.

### 5.4 Essential Toggle Behavior
- Toggle on: item immediately moves to top of its respective list; no longer enters Elo comparison pool
- Toggle off: item re-enters Elo pool at its current Elo rating; returns to rank-ordered position
- Visual: ⭐ button goes from gray/desaturated to gold/full-opacity with scale bounce

---

## 6. Reward & Retention Architecture

### 6.1 XP System
| Action | XP |
|---|---|
| Complete a comparison | +20 XP |
| Complete daily 3-round session | +75 XP bonus |
| Mark a task Done | +30 XP |
| 7-day streak | +200 XP |

### 6.2 Streak System
- Increments each day calibration is completed
- Displayed in "Would You?" progress bar row and Insights stats
- Milestones: 3, 7, 14, 30, 60, 100 days trigger milestone toast

### 6.3 Milestone Toast
Slides in from top: icon + title + subtitle. Auto-dismisses after 3.6 seconds.

### 6.4 Completion Ceremony
After completing all 3 comparisons:
- Overlay fades in with blur backdrop
- Badge bounces in (megaBounce animation)
- Title + subtitle fade up
- XP earned pill scales in
- Streak card slides up
- 4-wave confetti cannon
- CTA: "See My Priorities →" navigates to For You

---

## 7. Design Language

### 7.1 Aesthetic
Dark, game-like, rewarding. Not a productivity app — a **priority discovery game**.

### 7.2 Typography
- Display/headings: Unbounded 900
- Body: Figtree 300–800

### 7.3 Color Palette
```
--bg:      #07070d   (near-black)
--s1:      #0f0f1a   (card surface)
--s2:      #17172a   (elevated surface)
--s3:      #1e1e35   (pill/badge bg)
--violet:  #a78bfa / #7c6af7
--gold:    #f5c842
--green:   #34d399
--red:     #f87171
--cyan:    #22d3ee
--blue:    #3b82f6   (defender)
--red-b:   #ef4444   (challenger)
```

### 7.4 Calibrate Card Colors
- Challenger (top): deep crimson `#1f0808` → `#2d0e0e`, red border/glow
- Defender (bottom): deep navy `#080d20` → `#0c1530`, blue border/glow
- Winner border glows gold during drag commitment

### 7.5 Motion Principles
- All drag animations are **real-time** (not triggered at release)
- Spring easing: `cubic-bezier(.34, 1.56, .64, 1)` for bouncy entrances
- Card exit: `translateY` slide out with opacity fade
- Card entry: `slideFromTop` / `slideFromBot` keyframe animations
- Confetti: canvas-based, multi-shape (rect / circle / triangle / emoji), physics with gravity

---

## 8. Monetization

### 8.1 Free Tier
- Full calibration (3 comparisons/day)
- For You feed (top 5 tasks)
- Basic task management (up to 10 tasks)

### 8.2 WouldYouIQ Pro ($6.99/month or $49.99/year)
- Unlimited tasks and comparisons
- Budget alignment score + conflict detection
- Weekly Priority Report + shareable cards
- Streak freezes (3/month)
- Advanced behavioral insights

---

## 9. Technical Architecture

### 9.1 Recommended Stack
- **Mobile:** React Native + Expo
- **Animations:** Reanimated 3 + Gesture Handler (live drag via `useSharedValue` + `useAnimatedStyle`)
- **Navigation:** Expo Router (5-tab bottom navigation)
- **State:** Zustand (tasks store, budget store, user store)
- **Storage:** MMKV (local), Supabase (cloud sync)
- **Backend:** Supabase (Postgres + Auth + Realtime)

### 9.2 Key Data Models
```typescript
type Task = {
  id: string;
  emoji: string;
  name: string;
  timeEstimate: string;
  elo: number;           // starts at 1200
  essential: boolean;    // if true: excluded from comparisons, pinned to top
  deadline: 'today' | 'this week' | null;
  urgency: 'high' | 'med' | 'low';
  done: boolean;
  createdAt: Date;
}

type BudgetItem = {
  id: string;
  emoji: string;
  name: string;
  amountMonthly: number;
  type: 'essential' | 'flex';
  essential: boolean;    // if true: excluded from alignment flagging
}

type UserProfile = {
  name: string;
  xp: number;
  streak: number;
  comparisonsTotal: number;
  tasksCompleted: number;
  monthlyIncome: number;
  onboardingComplete: boolean;
}
```

### 9.3 Elo Engine
```typescript
const K = 16;
function updateElo(winnerElo: number, loserElo: number) {
  const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return {
    winner: winnerElo + K * (1 - expected),
    loser: loserElo + K * (0 - (1 - expected)),
  };
}
```

### 9.4 Pair Selection
- Only non-essential, non-done tasks enter the pool
- Weighted toward tasks with fewer total comparisons
- Never pair the same two tasks twice within the same session

### 9.5 Task Sort Order (For You + Tasks tabs)
```
1. Essential tasks (sorted by name alpha)
2. deadline === 'today' + non-essential (Elo desc)
3. deadline === 'this week' + non-essential (Elo desc)  
4. No deadline + non-essential (Elo desc)
```

### 9.6 Offline-First
All core functionality (calibration, For You, task management, budget viewing) works fully offline. Syncs when connection is restored.

---

## 10. Out of Scope (v1)

- Social/multiplayer features
- AI-generated task suggestions
- Calendar integration
- Team/shared priorities
- Web app (mobile-only v1)
- Spending account sync (manual entry only in v1)