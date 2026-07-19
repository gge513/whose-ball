---
title: Interaction patterns are promises — two dead clicks kill discovery everywhere
date: 2026-07-19
category: ui-bugs
module: navigation / member pages
symptoms:
  - "signature feature (season narrative) effectively undiscoverable"
  - "user stops trying an interaction after two failures"
  - "member pages reachable from exactly one link type on one page"
tags: [ux, discoverability, navigation, nextjs, nested-anchors, consistency]
commit: 56080e8
---

## Problem

The member page (home of the season narrative, the app's signature feature)
was reachable only by clicking an actor name in the /momentum feed. Names on
the task board and project pages rendered as plain text. During live testing
George clicked two names, got nothing, and said the load-bearing sentence:
"after seeing that my name wasn't a link in 2 places I assumed it wouldn't be
anywhere."

## Root cause

Each affordance teaches the user a rule. A pattern honored in one place and
broken in two others teaches the *negative* rule, and roughly two violations
extinguish exploration app-wide. The feature wasn't hidden by design; it was
hidden by inconsistency.

## Solution

A single `MemberLink` component (`app/components/member-link.tsx`) enforcing
one promise: a member's name is a door, everywhere it renders (task board,
project list and page, review console, /me catch card), falling back to plain
text only when no member exists behind it. Plus an explicit "your season →"
on /me. The fix is never "add a link somewhere"; it's "make the pattern hold
universally," and one component is what makes universality cheap.

## Gotcha encountered while fixing

The tasks row and project card were each one big wrapping `<Link>`; anchors
don't nest (invalid HTML, broken hydration). De-nest: the container becomes a
div, the title keeps the original destination, the name gets its own link.

## Prevention

When adding any clickable pattern, grep for every other render of the same
entity type and wire them in the same change. A pattern shipped partially is
worse than not shipped: it actively teaches users it doesn't exist.
