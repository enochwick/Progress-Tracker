# Progress Tracker — 30-Day Reset Blueprint

A daily ops tracker for executing a focused 30-day career sprint. Built for the [heynok](https://heynok.com) blueprint: top 3 priorities, daily output counters, time-blocked schedule, weekly milestones, copy-ready outreach scripts, and a full history of every day logged.

![Stack](https://img.shields.io/badge/stack-vite_+_react-D4FF00?style=flat-square)
![Storage](https://img.shields.io/badge/storage-localStorage-1F1F1F?style=flat-square)

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
- **Auto-save** — every change persists silently to `localStorage`

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

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

All data lives in your browser's `localStorage`. Nothing is sent anywhere. To clear, use the in-app **Reset** button or your browser's storage tools.

To migrate between devices, you'd export `localStorage` keys prefixed with `henok:` — the format is JSON.

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
