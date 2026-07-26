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
