---
title: When the spec moves, converge on an honest tracker of the external source of record
date: 2026-07-19
category: integration-issues
module: app/review/* (vote console)
symptoms:
  - "in-app mechanism implements a spec the external program retired"
  - "users could believe an in-app action counted officially when it didn't"
tags: [source-of-record, sync, tri-state, github, votes, truth-telling-ui]
commit: e1da7e2
---

## Problem

The app's private review-gated ballot implemented the program's original vote
spec. Mid-week the program moved the official vote to a public `Vote: up` line
kept in the review issue body on the peer's repo. The in-app thumbs now
recorded nothing that counted, and nothing told the user.

## Root cause

A mechanic verified at build time can be wrong by use time when the governing
spec is external and moving. The failure mode isn't the stale code, it's the
silent misrepresentation: UI that lets a user believe an action counted.

## Solution

Neither amputate the feature nor pretend: convert it into an honest tracker of
the source of record. Both review-filing paths now fetch the issue and parse
the body for the official line; a confirmed `Vote: up` syncs the thumb. The
copy states where the vote of record lives.

The load-bearing detail is the tri-state: confirmed-present syncs, but
**absent and unreadable never clear** — officially abstaining and privately
tracking are both legitimate, and a network failure is not evidence of
anything. `null` means unknown; only ever act on `true`. Collapsing
unknown into false is how sync features destroy user data.

## Prevention

For any internal mirror of external state: name the source of record in the
UI, sync only on positive confirmation, treat unknown as unknown, and re-verify
external specs at use time, not just build time (live artifacts and live pages
supersede your own week-old reconciliation).
