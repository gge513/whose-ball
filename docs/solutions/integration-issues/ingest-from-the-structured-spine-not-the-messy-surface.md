---
title: Ingest from the structured spine, not the messy surface
date: 2026-07-19
category: integration-issues
module: scripts/ingest-roster.mjs (roster ingest)
symptoms:
  - "filenames too inconsistent to parse (missing extensions, whole vendored folders, fork-sync noise)"
  - "cohort data on a program branch, not main; local origin was the fork"
tags: [ingest, github, upsert, idempotency, source-of-truth, git-remotes, oauth]
commit: 5bef901
---

## Problem

Ingesting the cohort's merged submissions into the app. The obvious source
(files in `submissions/`) was a swamp: missing extensions, handles that don't
match filenames, whole apps committed as folders, and one fork-sync PR touching
hundreds of other people's files.

## Root cause

Human free-text surfaces (filenames, file bodies) drift; machine-governed
records don't. The merged PRs against the program branch carry an authoritative
author login and merge timestamp per submission, regardless of how messy the
files are.

## Solution

Ingest from the spine, enrich from the surface: merged PRs → author + mergedAt
(latest merge wins per author); file content → repo/live URLs, with fallbacks
layered by trust (author-matched path in the PR → branch-listing fuzzy match →
README inside a vendored folder → the folder's true URL when no source repo
exists). Idempotent by construction: users `ON CONFLICT DO NOTHING` keyed on
github_login (so a later OAuth sign-in claims the pre-created row — verify the
auth path upserts on the same key before relying on this), submissions upsert
per user, events deduped. Skips are logged with reasons, never silent, and a
rerun after the deadline self-corrects fixed submissions.

## The two remote-hygiene traps

1. The PR base was a dedicated program branch — read `baseRefName`, never
   assume main. Cohort submissions *never* appear on main.
2. The local clone's `origin` was the fork, frozen at fork time; reading
   `origin/main` served week-old canon as current. Know which remote you're
   reading; add `upstream` explicitly and fetch it before calling anything live.

## Prevention

For any external-data ingest, ask "what's the machine-governed record here?"
before parsing human artifacts. And make reruns free: idempotent writes keyed
on stable identity turn "did we already ingest?" into a non-question.
