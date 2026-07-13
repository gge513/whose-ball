---
title: Whose Ball v2 — Verified Pilot Requirements Delta
type: feat
status: active
date: 2026-07-12
origin: docs/plans/2026-06-29-feat-whose-ball-cohort-pm-plan.md
supersedes-target: c2w1pm-submission (that contest closed Fri Jul 3; new target is the pilot's Project 1)
---

# Whose Ball v2 — the verified requirements delta

The June 29 design targeted the summer Cohort 2 Week 1 contest, which has already run. The live target is **Project 1 (PM platform) of the pilot George applied to** (admissions PR #22, decision ~Jul 14). This doc records what the program's own canon actually requires, verified 2026-07-12 against the public `rogerSuperBuilderAlpha/hult-cohort-program` repo, and what whose-ball must become to compete.

## Build-state cursor

> **Step:** SESSION D IN PROGRESS (structure locked 2026-07-13, all four on recommendation): (1) deploy FIRST, then features land on prod; (2) momentum feed + weekly narrative run on app events (tasks done, stage advances, reviews filed, blockers raised/cleared), GitHub merged-PR ingest designed-in but stubbed until real submission branches exist; (3) journey header = current phase + live countdown + YOUR standing, on every page; full spine only on the momentum page; (4) README thesis-led (motivation thesis → six decisions as feature tour → setup/architecture/URL/limitations tail). Resume at the first unfinished block: ~~deploy~~ → ~~momentum page~~ → journey header → weekly narrative → README+AGENTS.md → 10-user smoke.
>
> **MOMENTUM DONE (2026-07-13, commit 28636a9, verified on prod):** append-only `events` table (enum of 7 kinds; votes deliberately never emit) written by the server actions at real transitions; /momentum = 5 collective tiles + shipping feed, no per-person counts anywhere; backfilled 7 historical events from state-table timestamps; v1 heartbeat front page + Redis/Anthropic/cohort-json modules retired (git history keeps them); front door now: signed-in → /me, stranger → landing; moveTaskAction gained the auth check attribution forced. NOTE: drizzle-kit push wanted to truncate reviews (diff confusion on the live unique constraint) — migration 0002 was applied by running its SQL directly; use that path for future migrations too.
>
> **DEPLOY DONE + VERIFIED (2026-07-13):** live at https://whose-ball.vercel.app — Vercel project `whose-ball` (team gge513-8058s-projects), Git-connected to gge513/whose-ball (every push to main auto-deploys). Env vars on Vercel (Sensitive, Production+Preview): DATABASE_URL, GITHUB_PAT, AUTH_SECRET (fresh prod-only value), AUTH_GITHUB_ID/SECRET from the NEW prod OAuth app "whose-ball (production)" on gge513 (one OAuth app per environment; callback https://whose-ball.vercel.app/api/auth/callback/github). Verified: all 7 routes 200, both providers live, George's GitHub sign-in round-trips to his /me with Neon data intact across 3 deploys. George's earlier drag-and-drop attempt ("Vercel Drop") errored and is superseded by the Git pipeline.
>
> Sessions A, B, C COMPLETE; ADMITTED; **DATES CONFIRMED from the enrolled dashboard (committed `f5e34d4`): the pilot started Mon Jul 13 (kickoff Zoom 6pm ET that night); submission PR merged by SUN JUL 19 17:00 ET into `rogerSuperBuilderAlpha/hult-cohort-program` (branch `participants/summer26/phase-1-project-1/gge513`, title `[Project 1] Submission — gge513`); 58 reviews + 58 votes by Mon Jul 20 14:00 ET (cohort 59).** Week plan: Session D lands Tue/Wed; Thu/Fri polish + fresh-clone verify; PR opens Sat, merged well before Sun 17:00. Built: schema on Neon (6 tables), task board with Define gate/ball/blockers, two-door auth, /tasks filters, /me command center, /review console (review-gated private ballot, pace panel, deep flags, GitHub detection, gate verified end-to-end by George), v1 vote console retired. Demo peers are FAKE seeded rows — replace with the real roster or label before any demo/submission. **Next:** Session D — momentum page (collective tiles + shipping feed, no rank), journey header, per-member weekly narrative off merged PRs (rework of the v1 heartbeat front page), README from THESIS.md + AGENTS.md, deploy to Vercel (needs prod OAuth callback + env vars from George), 10-user smoke. Do not re-derive; resume there.
>
> **Session D open items (beyond the build itself):** sign the Expectations Acknowledgment on the dashboard (control not yet located — likely post-kickoff); pull the cohort MCP server guide (dashboard references programmatic access to reviews/votes — potential console integration); update `lib/github-reviews.ts` title matching to the live format `Review by @{me}: @{peer}`; ingest the real roster once the submissions branch fills and DELETE the four fake demo peers; note anything the kickoff call changes.
>
> **Parked for a future build session (George, 2026-07-13):** Session C flex hardening — paste-path existence verification via the GitHub API, page-load detection sweep across all peers, review-quality signals (150-word/citation checks on issue bodies), staff-only tally export for after votes close.

## Framework harvest (2026-07-13, all six ratified by George in serial walk-through)

Source ore: `docs/brainstorms/2026-07-13-motivation-framework-ore.md`. Thesis: `docs/THESIS.md`. Filter applied throughout: a delta earns core scope only if a stranger feels it in the first 30 seconds of a smoke test, and reflective input is never required to act.

1. **Pipeline at project altitude.** Projects carry a six-stage trajectory (Define → Commit → Build → Verify → Ship → Teach); tasks ride a light flow (todo / building / verifying / done, clears the 3-state baseline). Chosen over per-task six stages (ceremony) and skippable stations (decoration).
2. **The ball is a button.** Every project has one first-class next-action field and a holder; rendered on the command center as a click-through into where the work lives (task, PR, review issue). When-commitments optional, expire quietly. George's own restart mechanism ("click to action with the next step defined in front of me"), the cohort version of his /resume.
3. **Blockers, light version.** "Blocked" is a task state requiring three fields (what I tried, what I need, who can unblock). Surfaces on the momentum board and the unblocker's dashboard. Full help-matching system goes on the pinned public roadmap (which the operator handbook requires anyway).
4. **Front door = personal command center; momentum one glance away.** Cohort-pulse strip on the dashboard (deployed / PRs merged / reviews filed / help requests) clicking through to the full Momentum page. v1's who-shipped-who-is-quiet grid is retired: movement stays public via a shipping feed of real events; comparison and ranking do not exist anywhere. Per-person GitHub-fed weekly narrative survives on each member's own page.
5. **Define gates the story, never the work.** Instant name-only project creation; the three meaning questions (who benefits, what changes, what does done look like) are answered to advance out of Define; tasks are never blocked by stage; moving-but-undefined projects get a nudge. Staff smoke-test path is untouched by the gate.
6. **Thesis now.** One-pager assembled strictly from ore + these decisions; triple-use as README opening, demo-video spine, and pitch source. Stamped provisional; revisited once at ship.

Parked in ore (operator-phase, post-win): cohort failure-mode interviews, the hypothesis table, the metrics program.

## Live-site reconciliation (2026-07-13, supersedes repo docs where they differ)

Source: https://site-nine-rouge-68.vercel.app/program/phase-1-project-1 (the platform George was admitted to). Where this section conflicts with the repo-doc facts below, THIS wins.

| Fact | Live site (authoritative) | Old assumption (repo docs) |
| --- | --- | --- |
| Cohort size | **56 enrolled → 55 reviews + 55 votes** per Phase 1 project | 30 → 29 reviews |
| Submission | **PR to `rogerSuperBuilderAlpha/hult-cohort-program`**, branch `participants/summer26/phase-1-project-1/{handle}` → target `projects/summer26/phase-1-project-1`, title `[Project 1] Submission — {handle}` | repo `pm-{handle}` in a cohort org |
| Deploy deadline | **PR merged by Sunday week 1, 17:00 ET** (unmerged = ineligible) | Thu 17:00 |
| Review window closes | **Monday week 2, 14:00 ET** (no Wed checkpoint mentioned) | Wed 14:00 ≥10, Fri 14:00 all |
| Review issue title | **`Review by @{me}: @{peer}`** (two handles) | `Review by @{reviewer}` |
| PR body must include | Production URL · fresh-clone setup · architecture · **motivation/engagement design notes** · known limitations · agent usage | README-centric |
| Judging emphasis | **"Motivation is the key variable... progress visibility, clear next actions, signals that make people want to ship"** | 5-dimension rubric |
| Prerequisites | Cursor + Claude Code active (~$400/mo); **Expectations Acknowledgment signed on the dashboard** | — |

Implications for the build: pace math and seed scale should reflect ~55 peers; `lib/github-reviews.ts` title matching must accept the `Review by @{me}: @{peer}` format; `lib/review-week.ts` gets real dates once the dashboard shows them; the PR body's "motivation / engagement design notes" section is THESIS.md's job. Absolute calendar dates for week 1 are still unknown — read them off George's signed-in dashboard. The page also ships an "agent prompt template" for submission day; we use our own flow but its branch/title/body requirements are the contract.

## Verified sources (all in the public program repo)

| Fact | Source file |
| --- | --- |
| Baseline features, production bar, ballot eligibility | `curriculum/phase-1/project-1-pm-platform/requirements.md` |
| Review rubric (5 dimensions, weights, per-review time budget) | `.../review-rubric.md` |
| Review system (29 reviews, GitHub-issue format, quality grading) | `assessment/peer-review-system.md` |
| Vote mechanics (private thumbs, review-gated, no tallies) | `governance/winner-selection.md` |
| The weekly loop + pilot deadlines | `curriculum/phase-1/the-loop.md` |
| Winner's operator obligations (SLAs, integrations) | `.../operator-handbook.md` |

Local snapshots of all six are in the session scratchpad; re-pull from GitHub if stale.

## The headline: whose-ball as built is ineligible

Ballot eligibility requires ALL baseline features. Whose-ball has none of them; it was designed for a different contest brief ("don't rebuild a task tool, track shipping") that does not apply here.

**Baseline (required for ballot) vs current state:**

| Requirement | Whose-ball today |
| --- | --- |
| Projects: create/edit/archive | Missing |
| Tasks: title, description, status, assignee | Missing |
| Status workflow, 3+ states | Missing |
| Assign task to any cohort member | Missing |
| Multi-user auth, 30+ accounts (email+password or OAuth) | Partial: GitHub OAuth only; staff test account is email+password (`staff-review@hult-cohort.test`), so a credentials path is needed |
| Task list views: filter by assignee / status / project | Missing |
| Public HTTPS deploy, data persists across redeploys | Not deployed; Redis persistence exists |

**What survives as differentiators (explicitly listed in requirements.md as rubric-scored):**

- GitHub integration (link task to issue/PR): the heartbeat's whole engine.
- Review/vote module ("strongly valued"): our vote console, rebuilt to the real mechanics.
- Metrics dashboard ("PR counts, review completion"): heartbeat + review tracker, verbatim.
- Notifications, due dates, mobile responsiveness: candidates if time allows.

So the v2 shape: **a real task board at the core (eligibility), with whose-ball's GitHub-native intelligence as the differentiating layer (the win).** The name still works: the review queue is 29 balls in your court.

## Verified vote mechanics (replaces the approval-voting console)

1. Reviewer files a written review as a GitHub Issue titled `Review by @{handle}` on the reviewee's repo (150+ words, 3+ file citations, 5-dimension rubric, one actionable suggestion).
2. Saving that issue URL on the platform **unlocks** the vote for that peer.
3. Vote is a **private thumbs up / thumbs down per peer**. Individual votes private, live tallies never shown during review week, aggregates staff-only until announcement.
4. No self-review, no self-vote (UI + API enforced). Winner = most thumbs up; tie-break = median total rubric score.

Current console violates every axis (public counts, optimistic approval voting, self-vote allowed). Rebuild, don't patch.

## The review week is the killer feature surface

Scale at cohort 30: 29 reviews per person per project, ~45 min each, ~22 hours in one week. Milestones: 10 reviews due Wed 14:00, all 29 due Fri 14:00, votes Fri 16:00. Three staff-assigned deep reviews (300+ words) among them. Reviews are graded; short, citation-free, or copy-paste reviews hurt the reviewer.

The review console therefore tracks, per user: reviews filed (read live from GitHub Issues authored by them titled `Review by @`), which are deep-review assignments, words/citations sanity flags, pace vs the Wed/Fri lines, and the review-gated private ballot. This is simultaneously the cohort's biggest pain point and a named rubric differentiator.

## Journey spine (verified loop)

Build (Tue kickoff, Thu 17:00 deploy) → Review (Thu 17:00 to Fri 14:00) → Vote (Fri 16:00) → Operate (winner, with SLAs: 99% uptime, 24h PR triage, releases every 2 weeks). Everyone else: 2 PRs + 1 issue + 3 PR reviews per cycle on the winning platforms. The spine renders the current phase, its deadline, and the user's standing against it.

**Dates, provisional:** the-loop.md's compressed pilot table says Project 1 deploys **Thu Jul 22, 17:00 ET** (then Jul 29, Aug 5 for projects 2 and 3), while requirements.md carries an Oct 2 date from the fall term. If the Jul 22 date governs George's cohort, the build window after admission is days, not weeks, which is exactly why we are pre-building now. Confirm at kickoff.

## Repo constraints to honor at submission

- Repo will live in the cohort org as `pm-{github-handle}`, public, MIT, from the org template. Whose-ball code ports into it; this folder remains the workshop.
- `AGENTS.md` required. README must include setup, architecture diagram (ASCII fine), deploy URL, known bugs.
- Submission is a PR merged to the cohort repo's `main` by the deploy deadline; the PR body is the proof-of-work record. Staff smoke-test the URL at deadline; down = ineligible.
- Signup instructions in README; 5+ reviewer accounts on request; staff test account creatable.
- No hardcoded secrets; 10 concurrent users without visible errors.

## v2 build sequence (teaching sessions, in order)

- **Session A — the task board core.** Data model (users, projects, tasks) in Postgres (Neon via Vercel marketplace, Drizzle ORM; recommendation, ratify at session start). Projects: create instantly (name-only), edit, archive-flag, six-stage `stage` enum with the Define meaning fields (who benefits / what changes / done looks like) gating advancement only. Tasks: title, description, 4-state `status` enum (todo / building / verifying / done) plus `blocked` with its three fields, assignee FK, optional definition-of-done, `next_action` + holder on projects. Teaching: schemas, relations, enums as loud-failure design, CRUD, server actions.
- **Session B — people + the command center.** Email+password (credentials + hash) alongside the existing GitHub OAuth; open registration; assignment to any member; filter views by assignee/status/project (baseline). Personal command center front door: your balls as click-to-action buttons, who is waiting on you, cohort-pulse strip. Teaching: auth, sessions, authorization vs authentication.
- **Session C — the review console + real vote.** GitHub Issues ingestion for `Review by @` (the heartbeat pattern re-aimed), pace tracking vs Wed/Fri lines, deep-review flags, review-gated private thumbs with no visible tallies and no self-vote. Teaching: third-party API ingestion, invariants enforced server-side.
- **Session D — momentum + journey + ship.** Momentum page (collective tiles + shipping feed; no ranking), phase-aware journey header, per-member weekly narrative off merged-PR activity, README opening from THESIS.md + AGENTS.md, deploy, 10-user smoke, load-test flex.

Each session ends by moving this cursor and appending a COURSE-LOG entry with its flashcard deck.
