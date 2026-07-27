# Monday Recap

Every Monday, Andrea (marketing for a local gym) used to spend about an hour collecting
last week's numbers: Instagram screenshots, the Google Business dashboard, the Mailchimp
report — then pasting them into a note, eyeballing what changed, and writing a message to
the owner. This tool turns that hour into two minutes.

**Drop in the exports and screenshots → get the owner-ready Monday message.**

## The one design rule

The agent behind the app only reports numbers it can point to in what you dropped in —
and every win or concern names the input it came from. Anything it looked for and
couldn't find goes in a **Missing / couldn't verify** panel — it never guesses, it never
invents a week-over-week comparison when the prior week isn't there, and it never
back-calculates a "prior week" from a rounded dashboard percentage.

## Try the live tool (no setup)

The tool is live at [monday-recap.vercel.app](https://monday-recap.vercel.app) — it
serves its own sample data via "Sample data to try it" in the page footer
([`sample-data/`](sample-data/) in this repo holds the same files): a full realistic
week of five CSV exports and two dashboard screenshots. Drop them all in, click once.

For the stress test: leave out `instagram-daily-jul6-12.csv` (last week's Instagram
export) and run it again — the agent keeps this week's exact numbers, reports the
comparison only as what the dashboard shows, refuses to invent the prior week, and the
Missing panel asks for the export it needs.

## Run this repo locally

```bash
npm install
cp .env.example .env   # add your Anthropic API key
npm run dev            # http://localhost:3000
```

## Deploy your own

Push to GitHub → import in Vercel → set `ANTHROPIC_API_KEY` in project env vars. Done.

## How it works

One page, one API route, one agent.

- `app/page.tsx` — drop zone, file chips, results
- `app/api/recap/route.ts` — sends CSVs as text and screenshots as images to the agent, expects strict JSON back
- `lib/agent.ts` — the agent's contract (the actual product; the full prompt library, every version included, in `PROMPTS.md`)

The app stays deliberately thin — a front door. The agent in the cloud turns what she
drops in, into what she sends — and the evidence contract governs every number on the way.
