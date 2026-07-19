---
title: States the UI can't produce still need server-side guards — and seeding them is free fuzzing
date: 2026-07-19
category: runtime-errors
module: projects ball state (setBallAction, /me, project page)
symptoms:
  - "two pages disagree about the same entity (/me shows a held ball; project page says no ball set)"
  - "whistle badge invisible on one surface"
  - "state 'impossible' through the form, reachable through scripts/bugs"
status: diagnosed — server guard queued as tune-list #2 in the v2 delta doc
tags: [invariants, server-actions, validation, seeding, fuzzing, dual-truth]
---

## Problem

A sandbox seed created a project with a ball holder but no next action. /me
(keying ball-existence on `ballHolderId`) showed a whistled held ball; the
project page (keying on `nextAction`) said "No ball set" and hid the whistle
entirely. George hit the contradiction live within minutes.

## Root cause

Two, compounding:
1. **Dual truth:** two surfaces used different fields as the existence test for
   the same concept. Any state where the fields disagree renders as two
   contradictory pages.
2. **Client-only invariant:** the "one named next action, one holder" rule
   lived in a form's `required` attribute. `setBallAction` accepted a holder
   with no action — so scripts, seeds, or any future form reach the state the
   UI promises is impossible.

## Solution

Pick ONE existence test (the schema comment defines the ball as action +
holder together, so enforce both-or-neither), guard it in the server action
(reject, loudly), and render dependent badges (the whistle) regardless of
which display branch is taken. Guard not yet shipped — tracked as tune-list
#2; the seed state deliberately remains until it lands.

## The reusable move

Seeding a "can't happen" state wasn't a seed bug, it was accidental fuzzing
that exposed a real gap in minutes of live use. When building test fixtures,
deliberately include near-invariant-violating states: either the app rejects
them (guard exists) or renders nonsense (you just found the missing guard).

## Prevention

For every invariant, ask "who enforces this when the form isn't the writer?"
If the answer is "the browser," it's unenforced. And for every domain concept,
grep for its existence test across all surfaces — more than one definition is
a dormant contradiction.
