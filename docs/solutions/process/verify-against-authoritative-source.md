---
title: Confirm the expected shape from canon + merged precedent — don't infer it
category: process
tags: [verification, requirements, canon, live-behavior, agent-discipline]
date: 2026-07-20
problem: Twice in one session, acting on an inferred understanding would have been wrong — a missed deadline and a mis-built Week-2 project. Both were caught by checking the authoritative source instead.
source: COURSE-LOG Entry 015 (Week 1 close → Week 2 scoping)
---

# Confirm the expected shape from canon + merged precedent — don't infer it

Two near-misses in one session, same root cause, same fix.

## The two failures

1. **The deadline.** I told George Week 1 voting ran until Friday. It closed Monday. Two sources
   existed: the canon doc said Friday; his live dashboard said Monday. His standing rule is
   *live-site facts supersede the repo docs*. I overrode the dashboard with my reading of the doc,
   and was wrong. The winner had been chosen before we knew it.

2. **The Week-2 shape.** The plan on the table was "a PR into the winning app (Forth) that adds a
   comms tool." Wrong. The canon spec (`curriculum/phase-1/project-2-comms-platform/requirements.md`)
   says ballot eligibility is a *standalone* `comms-{handle}` repo with its own deploy, integrating
   with the PM winner via **matching email**, not by building into it. Confirmed independently by a
   merged peer submission (nikjain15's "Rally," PR #63) and the staff reference submission. We caught
   it one confirmation before building the wrong thing.

## The method that works

To confirm "the expected way to do X," check **two** authoritative sources and require them to agree:

1. **The written canon** — the spec/requirements/rubric doc in the repo, read *verbatim*, not
   paraphrased or remembered.
2. **The live behavior** — what has actually been merged / what peers are actually doing / what the
   live dashboard shows. This is the "live-site supersedes docs" rule in action.

When the written rule and the observed behavior agree, that's the answer. When they conflict, the live
behavior usually wins (docs go stale), but the conflict itself is the signal to stop and confirm, not
to pick the one that matches your assumption.

## Why inference feels safe and isn't

A single plausible source (an email, one doc, your own prior reasoning) produces a confident,
coherent, wrong answer. The failure is invisible until it's expensive. The cost of the check is one
`grep` of the canon and one look at merged PRs — minutes against a missed deadline or a mis-built
project.

## Related

- Rubric drift, same session: 22 agents handed a *paraphrase* of the rubric all invented the same
  wrong meaning. Quote the source verbatim into any shared brief; agents agreeing with each other is
  not verification.
- Empty search/connector results are hypotheses about the tool, not facts about the world — verify.
