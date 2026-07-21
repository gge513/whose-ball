---
title: Filing many GitHub issues via gh CLI — three traps
category: integration-issues
tags: [github, gh-cli, bash, zsh, batch-filing, verification]
date: 2026-07-20
problem: Filing 23 peer-review issues across many repos via `gh issue create`; two misfiled and a verification pass falsely reported zero.
source: COURSE-LOG Entry 015 (Week 1 review sprint)
---

# Filing many GitHub issues via `gh` — three traps

Filing a batch of issues (23 peer reviews across 19 own-repos + 1 central repo) surfaced three
failures worth not re-learning. All three are about the gap between "the command returned a URL" and
"the right thing is actually in the right place."

## 1. Use a LITERAL repo string for the filing target — never a variable through nested quoting

Two reviews meant for the cohort repo were filed to `gge513/whose-ball` (my own repo) instead. Cause:
inside a `bash -c '...'` block, a central-repo variable was interpolated as `'"$C"'` where `$C` was
expected to expand in the *inner* shell but was read by the *outer* shell, where it was empty. An
empty `--repo ""` makes `gh` fall back to the current directory's git remote — which was whose-ball.

- **Fix:** pass the target repo as a literal string, or set and reference the var entirely within one
  shell. When a filing target is dynamic, echo it before the create call and eyeball it.
- **Recovery:** `gh issue delete` the misfiles (you own the repo), re-create with the literal target,
  verify titles.

## 2. zsh does not word-split unquoted variables — a loop over `$PAIRS` runs ONCE

`for pair in $PAIRS; do ...` iterated a single time in zsh, treating the whole space-separated string
as one item (bash would split it). The first `gh api repos/$r` got a garbage multi-repo path → 404.

- **Fix:** run batch loops under `bash -c '...'`, or in zsh use `${=PAIRS}` / `${(s: :)PAIRS}` to force
  splitting. Symptom to recognize: a loop that should run N times prints once and errors.

## 3. GitHub's search index lags — verify fresh filings with `--author`, not `--search`

Right after creating all 23 issues, `gh issue list --search "Review by @gge513 in:title"` returned 0
for every repo. Nothing was wrong — the search index is eventually-consistent and lags minutes behind
creation. The direct issues API has no such lag.

- **Fix:** audit freshly-created issues with `gh issue list --repo R --author gge513` (or `gh issue
  view N`), never `--search`/`in:title`. A zero from search on brand-new objects is a hypothesis about
  the index, not evidence of absence. (See also: empty connector results are hypotheses, not facts.)

## The meta-lesson

A returned URL is not proof the right content is in the right place. For irreversible or public writes,
verify against live state with a lag-free read, and verify the *target*, not just the *success*.
