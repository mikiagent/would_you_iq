# WouldYouIQ (Expo rebuild)

Mobile-first priority calibration app rebuilt from the `ui_redesign` prototype and PRD v4.

## Stack

- Expo (React Native, TypeScript)
- Expo Router (stack + tabs)

## Features

- Tasks tab (list with filters, seeded demo tasks)
- Would You? calibration tab (single-card chooser)
- For You tab (top-priority card, quick Done)
- Budget tab (overview of income, leftover, and items)
- Settings tab (XP, streak, and stats)

All data is currently in-memory using seeds from `ui_redesign`. A thin `data/api.ts` layer is ready to be swapped to Supabase.

## Running

```bash
cd wouldyouiq/wouldyouiq
npm install
npm run dev
```

Then open the Web URL shown in the terminal (usually `http://localhost:8081`).

