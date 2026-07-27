# Prompts — full version history

The agent's contract is the real product here, so this file shows every version of it,
including the one that didn't work, with what actually happened when it ran.

- **§0 — the kickoff prompt** (the context the build started from)
- **V1 — unconstrained summary** (failed honestly)
- **V2 — the evidence contract** (structured output + the missing list)
- **V3 — source-aware output** (every number carries its source; no inferred priors)

## §0 — the kickoff prompt (how the build started)

A build starts with context, not code. This is what went into the model's window before a
single file existed:

```
Here's the workflow we're transforming:
Every Monday, Andrea (marketing, local gym) pulls numbers from Instagram, Google
Business, and Mailchimp, compares to last week from memory, and writes the owner a
short update. 45-60 min.

The goal:
The smallest web tool that kills the synthesis hour. She drops in the exports +
screenshots she already has; it writes the message she already writes.

Requirements + constraints:
single page - one API route - Claude with vision (her inputs are screenshots) - owner
message + wins/concerns + a missing list for anything unverifiable - no database - no
accounts - zero setup for Andrea - API key server-side only
```

## V1 — unconstrained summary (the naive start)

```
You are a marketing assistant for Coastline Fitness, a local gym. You have been given CSV
exports and dashboard screenshots from Instagram, Google Business Profile, and Mailchimp.
Summarize last week's marketing performance as a short message from Andrea to Mark, the
owner. Include what went well, what went down, and three post ideas for this week.
```

**What it produced (excerpts from a real run on the sample inputs):**

> "IG reach hit **7.5K**, up 79% from the week before."
> "The Bring a Friend email **did well too** — 42.5% open rate, 58 clicks."

It sounded right and was quietly wrong in three ways:

1. **It preferred the screenshot's rounded value over the export.** "7.5K" came from the
   Instagram screenshot; the exact number, 7,481, was in the CSV it had also been given.
2. **It graded with no baseline.** "The email did well" — there was exactly one campaign
   in the inputs. Well compared to what?
3. **It hid its gaps.** Nothing surfaced what it looked for and couldn't find, so a
   missing week of email data silently became confidence.

Its arithmetic was correct and it even hedged one metric on its own — but instincts
aren't a contract. v2 makes them one.

## V2 — the evidence contract

```
You are Monday Recap, a tool that writes Andrea's weekly marketing recap for Coastline
Fitness, an independent local gym (~350 members). Andrea sends this to Mark, the owner,
every Monday morning.

CONTEXT
- Channels: Instagram (@coastline.fitness, ~3,200 followers), Google Business Profile
  (calls, direction requests, website clicks, intro-session bookings), Mailchimp
  (list ~1,240, sends 1-2x/month).
- Voice: texting a busy friend. Short sentences. Plain words. Numbers first, then what
  to do about them. No marketing jargon.

HARD RULES (these outrank everything else)
1. Only report numbers you can point to in the provided inputs (a CSV row or a visible
   screenshot value). Never estimate. Never fill a gap because a number seems plausible.
2. Week-over-week deltas ONLY when both weeks are present in the inputs for that metric.
   If the prior week is missing, give the current number alone and list the gap in
   "missing".
3. Anything you looked for and could not find goes in "missing" as a short plain phrase:
   what is absent and what it blocks. Example: "prior-week email stats - can't compare
   email performance".
4. If a screenshot and a CSV disagree on the same metric, trust the CSV (it is the
   export) and note the conflict in "missing".
5. Screenshots often show rounded values like "7.5K". When the exact number exists in a
   CSV, use the exact number.

OUTPUT
Respond with ONLY this JSON object, no prose before or after:
{
  "summary_message": "The full Monday message to Mark, ready to paste. 120-180 words,
  in Andrea's voice.",
  "wins": ["metric + number + one plain-English sentence on why it matters"],
  "concerns": ["metric + number + one plain-English sentence"],
  "missing": ["what's absent and what it blocks"],
  "post_ideas": ["three ideas grounded in what actually performed this week, doable
  with a phone"]
}
```

**What changed and why:** each hard rule maps to a v1 failure — rule 5 is the "7.5K"
fix, rule 2 kills invented comparisons, rule 3 turns silent gaps into a visible
"missing" panel, and the JSON schema makes the output renderable and checkable.

**What it produced on the same inputs:** exact "7,481" instead of "7.5K"; the email gap
flagged both in `missing` and inline in the message ("Can't compare email performance
week over week — this was the only campaign on file"); five correct week-over-week
deltas, computed only where both weeks existed; post ideas grounded in the actual top
posts rather than generic advice.

**Known edge, kept honestly:** v2 still says the email "did well" — an evaluative word
with a quoted number and a visible no-comparison flag, but no stated baseline.

## V3 — source-aware output (shipped, in `lib/agent.ts`)

Auditing V2's full output against its own contract turned up a subtler leak: when the only
prior-week evidence for a metric was a rounded percentage on a dashboard screenshot, the
agent could still present an inferred absolute prior ("up 79%, from 4,180") as if it had
read that number somewhere. The headline hallucination was fixed; the *audit of every
number in the output* wasn't complete.

**What changed and why:**

1. **Rule 6 — no inferred priors.** If the only prior-week evidence is a rounded dashboard
   %, the agent reports the change as dashboard-reported ("the dashboard shows reach up
   79%") and never states a prior-week number for it. Absolute priors require rows it can
   actually sum.
2. **Rule 7 — every number carries its source.** `wins` and `concerns` items became
   `{ text, source }`, and the page renders the source next to each claim — "7,481" is
   visibly traceable to the Instagram daily export.
3. **Shorter message.** The owner note tightened from 120–180 words to 90–130 — it's a
   text to a busy owner, not a report.

The lesson under all three versions: the fix is never "prompt harder" — it's auditing the
whole output against the contract, not just the number that first went wrong.

**Hardening note (found in live integration):** run-to-run, the model would occasionally
answer in prose instead of the JSON shape — instructions alone weren't a guarantee. The
same schema the contract describes is now also enforced at the API level (structured
outputs on the Messages API), so the page never depends on the model choosing to comply.

## V4 — the QA hardening (shipped, in `lib/agent.ts`)

A repeated-run QA pass against the deployed tool — full seven-file drops plus the
withheld-export stress test, over a dozen runs — surfaced two leaks that only show up
across many runs.

**1. The scaffolding set a trap.** With last week's Instagram daily export withheld, the
agent sometimes reported "up from 3,704" as last week's reach — even citing the daily
export as the source. 3,704 is real arithmetic on the wrong thing: the sum of the four
*posts* listed for that week in the posts export. And the trap was self-inflicted: the
VERIFIED TOTALS block sums every CSV by week, and rule 8 said "use these totals for
week-over-week comparisons." Fix: rules 2, 6, and 8 now distinguish per-post/per-campaign
sums from account-level weekly exports (one never stands in for the other), and the totals
block itself carries the same caution.

**2. A complete-looking shape isn't a complete answer.** On occasional runs the model's
thinking spiked and consumed the output budget; structured outputs kept the JSON *valid*,
so a half-written message with empty sections could render as if it were the answer. Fix:
a larger budget, plus a completeness gate in the route — it checks the stop reason and the
shape's actual content, retries quietly while time allows, and returns an honest error instead of ever
serving a partial recap. The page also stopped rendering empty sections.

Two smaller tightenings from the same pass: "missing" is now strictly for absent or
unverifiable inputs (no reconciliation notes), and source labels are plain input names —
never internal machinery like the totals block.

The lesson this round: the failure modes you ship are often the ones your own scaffolding
invites. Audit the scaffolding with the same suspicion as the model.
