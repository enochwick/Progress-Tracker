# Progress Tracker — 30-Day Reset Blueprint

A daily ops tracker for executing a focused 30-day career sprint. Built for the [heynok](https://heynok.com) blueprint: top 3 priorities, daily output counters, time-blocked schedule, weekly milestones, copy-ready outreach scripts, and a full history of every day logged.

![Stack](https://img.shields.io/badge/stack-vite_+_react-D4FF00?style=flat-square)
![Storage](https://img.shields.io/badge/storage-Supabase_+_local_fallback-1F1F1F?style=flat-square)

## Features

- **Day counter** — auto-calculates which day of the 30-day sprint you're on
- **Top 3 wins** — write three priorities every morning before anything else
- **Output counters** — tally job apps, LinkedIn DMs, Upwork proposals, Social Booth outreach against daily goals
- **Income log** — track money earned per day
- **Time-blocked schedule** — eight checkable blocks from morning ritual to end-of-day comms
- **Weekly milestones** — auto-loads Foundation → Pipeline Fill → Conversion → Acceleration as the sprint progresses
- **Outreach scripts** — four copy-paste templates (LinkedIn DM, network reactivation, Social Booth pitch, Upwork proposal)
- **End-of-day review** — what hit + tomorrow's #1 priority
- **Save & lock** — finalize a day with a timestamped lock; unlock anytime to edit
- **History view** — see every day logged with stats (days locked, total income, tasks done)
- **Auto-save** — every change persists silently to Supabase when configured, with `localStorage` fallback for local setup

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

## Supabase cloud sync

Cloud sync makes saved history survive incognito windows, browser restarts, and different devices.

1. Create a Supabase project
2. Open the Supabase SQL editor and run `supabase-schema.sql`
3. Copy `.env.example` to `.env.local`
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase Project Settings → API
5. In Supabase Auth settings, enable Email provider
6. For Vercel, add the same two environment variables, then redeploy

When Supabase env vars are present, the app shows a sign-in/create-account screen. Each account only reads and writes its own progress rows through Row Level Security.

## Build for production

```bash
npm run build
```

Outputs to `dist/`.

## Deploy to Vercel

The fastest path:

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Vercel auto-detects Vite and deploys — no config needed

Or via CLI:

```bash
npm i -g vercel
vercel
```

## Data & privacy

When Supabase is configured, progress is stored in your Supabase project under the signed-in user account. When Supabase is not configured, data falls back to your browser's `localStorage`.

To clear cloud data, use the in-app **Reset** button while signed in. To clear local fallback data, use the in-app **Reset** button or your browser's storage tools.

## Tech stack

- **Vite** — build tool
- **React 18** — UI
- **lucide-react** — icons
- No CSS framework; styles inlined for portability

## Customization

Open `src/DailyChecklist.jsx`. The sections you'll likely tweak:

| Constant | What it controls |
|---|---|
| `DAILY_TASKS` | The 8 time blocks of the daily schedule |
| `COUNTERS` | The output counters and their daily goals |
| `WEEK_MILESTONES` | The 4-week milestone progression |
| `SCRIPTS` | The copy-ready outreach templates |
| `C` (color object) | Accent color, background, all theme tokens |

## License

MIT — use it however helps you ship.

---

*Built for Henok Tadesse · Dallas, TX*
