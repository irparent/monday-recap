# Monday Recap — The Prompt Library

Six stations, in order, from empty folder to trustworthy agent.

This is the prompt sequence that builds Monday Recap. It is distilled from the real build:
same arc, same failure, same contract - cleaned up so that someone else can run it. Execute
the stations in order and you end up with the same tool: a single page where a gym marketer
drops her weekly exports and screenshots, and an agent in the cloud writes the owner message
she used to spend an hour assembling - without ever inventing a number.

**The arc:** Initial build → useful first agent → failure → evidence contract → source-aware
agent → missing-source validation. The failure is a station, not an accident: you have to see
what an unconstrained agent does with real marketing data before the contract that fixes it
means anything.

**What you need**

- An agentic build tool. This was built with Claude Code; any comparable tool works. Deeper
  reasoning pays off at build time (an Opus-class model); the runtime model inside the app is
  Claude Sonnet 5 with vision - the inputs are screenshots, and a weekly recap needs fast and
  cheap, a few cents a run.
- An Anthropic API key (server-side only, always in an environment variable).
- A Vercel account (or any Next.js host) for the deploy.
- The sample week of data: `sample-data/` in this repo, also served by the live tool at
  `/sample-data.zip`.

**How each station reads:** what it produces → the prompt (copy it whole) → done when → why
it's shaped this way. Prompts are self-contained; nothing depends on a conversation you didn't
have.

**Two formats, one source:** this markdown file is the agent-readable version and the source
of truth; the PDF that ships alongside it is the same library typeset for people.

---

## P1 · Initial build - the whole problem before a single file

**What it produces:** the scaffold - one page, one API route, one agent file.

A build starts with context, not code. The entire problem goes into the model's window first;
the scaffold ask is the last three lines, not the first.

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

Build the smallest version of this: a Next.js app with one page (a drop zone for CSV
and image files, an optional note field, one button), one API route at /api/recap, and
one file that will hold the agent's system prompt. No database, no logins, no state.
```

**Done when:** the page renders with a drop zone that accepts files, and the route answers a
POST.

*Why it's shaped this way:* the constraints are the design. "Missing list for anything
unverifiable" is in the kickoff on purpose - the most important panel in the finished tool was
part of the problem statement, not a later idea.

---

## P2 · The useful first agent - deliberately unconstrained

**What it produces:** a working agent, version one, that reads her real files and writes a
plausible Monday message.

First the wiring:

```
Wire /api/recap to Claude Sonnet 5 with vision: CSV files go into the request as text
blocks, screenshots as images, plus the optional note - one request. Render the reply
on the page. Use the following as the agent's entire system prompt.
```

Then the contract, **version one**:

```
You are a marketing assistant for Coastline Fitness, a local gym. You have been given CSV
exports and dashboard screenshots from Instagram, Google Business Profile, and Mailchimp.
Summarize last week's marketing performance as a short message from Andrea to Mark, the
owner. Include what went well, what went down, and three post ideas for this week.
```

**Done when:** dropping the sample week produces a readable owner message with real numbers
in it.

*Why it's shaped this way:* version one is deliberately unconstrained - just "summarize these
marketing results." You need to watch what the model does with that much freedom before you
can write rules that mean anything. Keep this version; it becomes the most interesting part of
the story.

---

## P3 · The failure, on purpose - audit every number

**What it produces:** the failure list that the evidence contract is built from.

```
Run the agent on the full sample week (all CSVs and both screenshots). Then audit the
output line by line: for every number and every claim in the message, name the exact
input it came from - a CSV row, a sum of rows, or a visible screenshot value. For every
comparison, confirm both weeks are actually in the inputs. List every claim that fails
the audit, and everything the agent looked for, didn't find, and didn't mention.
```

**Done when:** you have a written list of every claim that can't be pointed to. On this data,
expect three findings:

1. **It prefers the screenshot's rounded value over the export.** "Reach hit 7.5K" - read off
   the dashboard image while the exact 7,481 sat in the CSV it was also given.
2. **It grades with no baseline.** "The email did well" - there is exactly one campaign in the
   inputs. Well compared to what?
3. **It hides its gaps.** A missing week of email data appears nowhere in the output. The gap
   silently became confidence.

*Why it's shaped this way:* the audit question - "can you point to it?" - is the whole product
in embryo. Sounding right and being verifiable are different properties, and only the audit
tells them apart.

---

## P4 · The evidence contract - version two

**What it produces:** an agent whose failure modes from P3 are structurally closed, and whose
output is structured data the page can render as sections.

Swap the entire system prompt for **version two**:

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

Then update the page:

```
The route now returns JSON. Render it as sections: the message with a copy button, an
amber "Missing / couldn't verify" panel, then Wins, Watch (the concerns), and Post
ideas. Hide any section that comes back empty.
```

**Done when:** the same inputs produce exact "7,481" instead of "7.5K"; the email gap is
flagged in the missing panel AND inline in the message; comparisons appear only where both
weeks exist.

*Why it's shaped this way:* every rule maps to a P3 finding - rule 5 is the "7.5K" fix, rule 2
kills invented comparisons, rule 3 turns silent gaps into a visible panel. And the output
changes from free-form text to structured data, because a shape you can render is a shape you
can check.

---

## P5 · The source-aware agent - version three, the shipped contract

**What it produces:** the finished agent - every claim carries its source, priors are never
reconstructed, arithmetic is code's job, and the output shape is a platform guarantee.

Swap the system prompt for **version three** (this is the shipped contract, verbatim from
`lib/agent.ts`):

```
You are Monday Recap, the agent that writes Andrea's weekly marketing recap for Coastline Fitness, an independent local gym (~350 members). Andrea sends this to Mark, the owner, every Monday morning.

CONTEXT
- Channels: Instagram (@coastline.fitness, ~3,200 followers), Google Business Profile (calls, direction requests, website clicks, intro-session bookings), Mailchimp (list ~1,240, sends 1-2x/month).
- Voice: texting a busy friend. Short sentences. Plain words. Numbers first, then what to do about them. No marketing jargon.

HARD RULES (these outrank everything else)
1. Only report numbers you can point to in the provided inputs (a CSV row, a sum of CSV rows, or a visible screenshot value). Never estimate. Never fill a gap because a number seems plausible.
2. Week-over-week deltas ONLY when both weeks are present in the inputs for that metric, from the same kind of export. A per-post or per-campaign file sums only the items listed in it - that is NOT an account-level weekly total and never stands in for a missing weekly export. If the prior week's export is missing, give the current number alone and list the gap in "missing".
3. Anything you looked for and could not find goes in "missing" as a short plain phrase: what is absent and what it blocks. Example: "prior-week email stats - can't compare email performance". If a weekly export needed for a comparison is absent, name that export. Before finishing, check every channel in the inputs: a channel with only one week of data ALWAYS produces a missing entry - an empty missing list is only correct when every channel has both weeks. But "missing" is only for absent or unverifiable inputs: never observations, reconciliation notes, or confirmations that things agree.
4. If a screenshot and a CSV genuinely disagree on the same metric, trust the CSV (it is the export) and note the conflict in "missing". Rounding is not a disagreement - a screenshot value or % that matches the CSV is not a conflict and needs no missing entry.
5. Screenshots often show rounded values like "7.5K". When the exact number exists in a CSV, use the exact number.
6. Never state a prior-week value you cannot point to in a weekly export for that week. Do not infer one from a rounded dashboard percentage, and do not reconstruct one from another file's sums (a posts file's reach total is not last week's account reach). If the only prior-week evidence for a metric is a rounded % on a screenshot, report the change as dashboard-reported (e.g. "the dashboard shows reach up 79%"), do NOT state a prior-week number for it, and list the absent weekly export in "missing".
7. Every item in "wins" and "concerns" names its source in plain words - the input the number came from (e.g. "Instagram daily export (both weeks)", "Google Business export", "Mailchimp export", "dashboard screenshot"). The label must describe what was actually provided: say "both weeks" only when both weeks of that export are in the inputs, and name the export the number really came from. When only this week's export was provided and the comparison is dashboard-reported, label it "Instagram daily export (this week) + dashboard screenshot". Never cite internals: no "VERIFIED TOTALS", no rule numbers, no raw file names.
8. The inputs include a VERIFIED TOTALS block - weekly sums computed in code from the CSV rows, each line covering only the rows present in that one file. Use those totals as-is for weekly numbers and week-over-week comparisons (subject to rule 2). Never re-derive a multi-row sum by hand.

OUTPUT
Respond with ONLY this JSON object, no prose before or after:
{
  "summary_message": "The full Monday message to Mark, ready to paste. 90-130 words, in Andrea's voice.",
  "wins": [{ "text": "metric + number + one plain-English sentence on why it matters", "source": "which input this came from" }],
  "concerns": [{ "text": "metric + number + one plain-English sentence", "source": "which input this came from" }],
  "missing": ["what's absent and what it blocks"],
  "post_ideas": ["three ideas grounded in what actually performed this week, doable with a phone"]
}
```

Then make the platform carry what the prompt alone can't guarantee:

```
Harden the route around the contract:

1. Structured outputs: define the contract's JSON shape as a schema (sourced wins and
   concerns, additionalProperties false) and enforce it at the API level with
   output_config json_schema. The page must never depend on the model choosing to
   comply.
2. Arithmetic in code: before calling the model, sum every CSV's numeric columns by
   week in the route and pass the results in as a VERIFIED TOTALS block, labeled so
   per-post and per-campaign files can't be mistaken for weekly account totals. The
   agent reasons; the code adds.
3. Room to think: the model thinks before it answers, and thinking counts against the
   token budget. Size max_tokens so a thinking spike can never starve the answer.
4. Completeness gate: a schema-valid response can still be a truncated one. Check the
   stop reason and the actual content (message length, non-empty sections); retry
   quietly while time allows, and return an honest "please run it again" error rather
   than ever rendering a partial recap.
5. Render the source tag next to every win and concern, show a working indicator while
   the agent reads the week, and hide any section that comes back empty.
```

**Done when:** every win and concern renders with a plain-word source tag; weekly totals are
identical across repeated runs; a partial answer can never reach the page.

*Why it's shaped this way:* version two made the agent honest; version three makes the whole
system honest. Sources turn trust from a feeling into a link, code owns the arithmetic, and
the platform - not politeness - owns the output shape.

---

## P6 · Missing-source validation - prove the contract holds

**What it produces:** evidence, not features. Two runs, repeated, against the deployed tool.

```
Validation run 1 - the full week. Drop in all seven sample files plus a one-line note
about the promo. Verify: the reach number is the exact CSV total (7,481, not 7.5K);
every comparison states both numbers; every win and concern carries a plain-word source
tag; and the missing panel contains exactly one thing - the prior email campaign that
was never provided.
```

```
Validation run 2 - the stress test. Run it again, but withhold last week's Instagram
daily export on purpose. Verify: this week's exact reach still appears; the comparison
is stated only as what the dashboard reports (e.g. "the dashboard shows reach up 79%");
NO prior-week Instagram number appears anywhere in the output; the missing panel asks
for the withheld export by name; and comparisons that remain fully backed by data -
like Google Business - are still made.
```

**Done when:**

| Check | Run 1 (full week) | Run 2 (withheld export) |
|---|---|---|
| Exact reach | 7,481 stated | 7,481 stated |
| Prior-week reach | 4,180 stated | **never stated** - dashboard-reported % only |
| Missing panel | the prior email gap | asks for the withheld export by name + the email gap |
| Source tags | plain words, "(both weeks)" only where true | "Instagram daily export (this week) + dashboard screenshot" |
| Result completeness | full recap or an honest error - never a partial | same |

Repeat both runs a few times: the numbers must not move. Optional probes: screenshots only
(the tool degrades honestly to dashboard-reported values and asks for the exports); CSVs only
(exact numbers, no dashboard claims).

*Why it's shaped this way:* the tool's one promise is "it says so instead of guessing." A
promise you haven't tried to break is a hope. Run 2 is the attempt to break it.

---

## Appendix · What production taught (already folded into the prompts above)

- **A posts-file sum is not a weekly export.** Any per-item file whose rows happen to cover a
  week is a trap for a comparison-hungry model - rules 2 and 6, and the VERIFIED TOTALS
  labeling, exist because of it.
- **A valid shape is not a complete answer.** Schema enforcement guarantees form, not
  content - the completeness gate in P5 exists because a truncated response can be perfectly
  valid JSON.
- **Labels are the trust surface.** A source tag that overstates what was provided ("both
  weeks" when one was) undermines the exact thing the tag exists to prove - rule 7's precision
  language exists because of it.
- **Give the model vocabulary, not just prohibitions.** Telling it what not to write made it
  contort; handing it the exact label to use made it consistent.
