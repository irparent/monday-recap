# Prompts — version history

Keeping every version of the prompt here, including what actually happened when it ran.

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
aren't a contract. The next version makes them one.

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
