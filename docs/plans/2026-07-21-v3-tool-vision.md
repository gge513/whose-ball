# Whose Ball v3 — from cohort entry to working tool

> **Step:** SESSION 1 IN PROGRESS (started 2026-07-21, same session — George's call to build now: v3 is separate from cohort work, momentum wins; Week 2 comms still owed by Sun Jul 26 17:00 ET, tracked in the project memory). **Session 1 structure locked, all four George's calls:** (1) real workspace model scoped down — `workspaces` + `workspace_members`, `workspace_id` on projects, cohort migrated as workspace #1, no roles yet; (2) vision renders on BOTH /me and momentum; (3) **project goals follow the Foundation goals-canon DNA** (read-only read of `~/the-foundation/goals/2026.md`, 2026-07-21): goals are plural per project, each = statement + key result gradeable by a stranger + owner + timeline, with a **dropped/decided-not-to-do state recorded openly** (the canon's "Decided: closed" rows) — NOT a grown Define field, and NOT a task list (tasks are work; goals are outcomes with measures); (4) **workspace #2 = the Foundation team, chosen out loud** — whose-ball stays an OUTSIDE tool the Foundation team uses; it does not fold into the Foundation OS (the separation line is crossed for membership, not for plumbing). Resume mid-session at the first unfinished block: schema (workspaces + members + goals + vision) → migration 0007 (additive, backfill cohort as ws #1) → scope queries → vision renders → goals on the project page → build/verify/deploy.

## Why this file exists

George, in his own words: "I really want to make this into an app that works and exhibits the heart of the build, with an easy way to view and launch into work, and create vision." Week 1 is closed; whose-ball is no longer a contest entry. It is his tool now, and the six peer reviews (issues #2–#7) said exactly where the gap is: the ideas score near-perfect, the experience of meeting them is what loses people.

## The four locks (2026-07-21)

1. **User #1 = George plus a real small team, on real work** (B). Workspace architecture is therefore load-bearing, and auth hardening matters for real.
2. **The heart gets exhibited both places, landing first** (C). The landing page tells the thesis to a stranger (the ball, the three layers, progress-easier-to-see-than-unfinished-work, the anti-features stated proudly — THESIS.md surfaced, not buried); in-app explainers deepen for people already inside (continues Entry 012's thread; two reviewers said cold users can't map the terminology).
3. **Launch into work = deep links from outside** (C). Keep the UI; invest in the path from a notification (email/Slack) straight to the ball — pass lands, holder gets pinged, one tap puts them on the catch form.
4. **Vision lives at the workspace level; goals live at the project level** (George's own formulation, replacing the A/B/C). One workspace vision the projects ladder into; each project carries goals (the Define trio grows into this); the weekly narrative reads as progress toward the vision, not just activity.

## Open sub-questions — settle at kickoff, before Session 1

- **Which team?** If it's the Foundation team, that deliberately crosses the keep-projects-separate line and must be chosen out loud, not drifted into. Alternatives: a cohort working group, or George solo until a team self-selects.
- **Deep-link channel: email or Slack — or the Week 2 comms platform itself?** Strong tailwind to notice: the comms platform George builds this week is *literally a notification-and-deep-link system for a cohort*. Its patterns (and possibly its running instance) could be whose-ball's channel. Decide after Week 2 exists.

## Build shape (teaching-mode sessions; each session locks its own structure at start)

- **Session 1 — the workspace spine.** `workspaces` table + membership; the cohort becomes workspace #1 (nothing breaks); all queries scope to workspace; workspace `vision` field rendered where it belongs (the /me header and the momentum page are candidates); project-level goals field (grow the Define trio, don't duplicate it).
- **Session 2 — the landing page tells the thesis.** A stranger reads it and understands what the ball is and why there are no leaderboards. THESIS.md is the source; the page is the render.
- **Session 3 — notifications + deep links.** Ball passed → holder pinged → one tap to the catch form. Channel per the kickoff decision; Week 2 learnings land here.
- **Session 4 — real-team hardening + parked polish.** Invites (a team can't open-signup its way in), the parked pair from Entry 014 (paste-box `autoComplete="off"`, detect-from-GitHub silent no-op), and reviewer #7's demo/sandbox idea if a real team makes it earn its place.

## What we are NOT doing

No leaderboards, no points, no XP (the anti-features stay binding — they are part of the heart being exhibited). No open multi-team SaaS (that was option C of lock 1, explicitly not chosen). No speculative Forth/cohort integrations beyond what the workspace model gives for free.
