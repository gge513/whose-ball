---
title: FK constraints are a second auditor — a failed delete means your reference scan was incomplete
date: 2026-07-19
category: database-issues
module: prod data / demo purge
symptoms:
  - "DELETE fails with foreign key constraint violation mid-purge"
  - "reference scan said zero rows, delete says otherwise"
tags: [postgres, foreign-keys, delete, prod-data, dependency-order, neon]
---

## Problem

Purging the four seeded demo users from production: a pre-delete scan counted
their rows in every referencing table, then the delete failed halfway —
`reviews_submission_id_submissions_id_fk` violated.

## Root cause

The scan checked reviews *by* the fake users (`reviewer_id`) but not reviews
*on* their submissions (`submission_id`). A real user's demo review pointed at
a fake user's submission. Reference scans must walk both directions of every
FK path from the rows being deleted, including second-degree paths (users →
submissions → reviews/votes).

## Solution

Treat the constraint failure as information, not an obstacle: it named the
exact missed table and row. Inspect what it found (it was the already-disclosed
seeded demo review + vote), then delete in dependency order: reviews and votes
referencing the doomed submissions → submissions → events → users. Belt and
braces on prod deletes: re-verify ids against names immediately before
deleting, abort on any mismatch, and report per-table deleted counts plus an
after-state snapshot.

Note: the Neon HTTP driver runs each statement independently (no transaction
across queries), so a mid-sequence failure leaves partial state — order the
deletes so any prefix is safe on its own.

## Prevention

Before any prod delete: enumerate every FK in the schema that can reach the
target rows (both directions, transitively), count each, and only then write
the delete sequence. And when a live count disagrees with your notes (the doc
said 4 events; prod had 3), the live count wins — count, don't estimate.
