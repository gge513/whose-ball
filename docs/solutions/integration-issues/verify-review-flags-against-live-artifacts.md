---
title: Verify a review flag against live artifacts before implementing its stated fix
date: 2026-07-19
category: integration-issues
module: lib/github-reviews.ts (review detection)
symptoms:
  - "reviewer says code uses a stale format; code already matches the format they name"
  - "exact-string match silently misses real-world variants"
tags: [github-api, code-review, matching, exact-match, pagination, verification]
commit: 06f8697
---

## Problem

Staff review flagged `github-reviews.ts` as matching "the stale pre-pilot
issue-title format" and said to update it to `Review by @{handle}` — but the
code already matched exactly that. Implementing the flag as written would have
changed nothing.

## Root cause

The flag was directionally right, factually imprecise. The live artifacts told
the real story: actual filed issues carry suffixes (`Review by @handle
(phase-1-project-3)`) and current canon is a third form (`Review by @{you}:
@{peer}`). Strict equality missed two of the three real formats. The reviewer
sensed the brittleness but misdescribed the mechanism.

## Solution

Prefix match + handle boundary: title must start with `review by @{login}` and
the next character must not be a login character (`[a-z0-9-]`), so `@alice`
never matches `@alice2` but any suffix (space, colon, paren) passes. Verified
live against all three formats in the wild before shipping. Bonus found while
there: the GitHub `/issues` endpoint counts PRs against `per_page`, so a busy
repo pushes issues past page one — paginate a few pages before concluding
"not found."

## Prevention

Audit findings are claims (standing rule). Before implementing a reviewer's
stated fix, pull the live artifacts the code must handle and derive the fix
from them — the artifacts routinely reveal a better fix than the flag asked
for. For any format matched by exact equality against external input, ask
"who else writes these, and what decorations do they add?"
