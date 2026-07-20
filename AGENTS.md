# AGENTS.md

Working notes for any coding agent (and any human moving fast) in this repo. The product's design rationale is in [`README.md`](README.md) and [`docs/THESIS.md`](docs/THESIS.md); read those first. This file is the operational contract.

## Commands

```
npm run dev        # local dev server
npm run build      # production build; run before shipping nontrivial changes
npm run lint       # eslint
npm run db:generate  # drizzle-kit generate (SQL files into drizzle/)
```

`DATABASE_URL` must be set (see `.env.local.example`). There is no test runner; verification here is done by driving the real forms and pages (see Verification below).

## Layout

- `app/` — App Router pages (server components) + server actions (`app/*/actions.ts`).
- `lib/db/schema.ts` — the whole data model, heavily commented; read it before touching data.
- `lib/` — domain logic: `events.ts` (event emission), `rally.ts` (pass/catch/drop), `whistle.ts` (dead-ball sweep), `narrative.ts` (weekly match report), `journey.ts` (phases + standing), `stages.ts` (six-stage pipeline), `review-week.ts`, `github-reviews.ts`.
- `docs/plans/2026-07-12-pilot-v2-requirements-delta.md` — the build-state cursor and the verified program requirements. Resume from the cursor; never re-derive the current step.

## Hard invariants (violating these is a design regression, not a style choice)

1. **No ranking anywhere.** No per-person counts on any shared surface, no leaderboards, no comparison. Collective tiles and per-member narrative only.
2. **The ballot is invisible.** `votes` rows never emit events, are never aggregated in any UI query, and no surface may leak that a vote happened. Votes are review-gated and self-vote is rejected server-side.
3. **The events table is append-only.** Rows are never updated; deletion is reserved for purging seeded fake data, nothing else. Emit at most one event per real transition, at the transition, in the server action.
4. **Every write authenticates, and the cohort is deliberately flat.** Server actions resolve the session user first (attribution forces authentication); no unauthenticated mutation path. Beyond that, authorization is intentionally minimal: any signed-in member can advance a stage, catch or pass a ball, and move tasks on any project, because shared motion is the mechanic, not a leak. The one exception is archiving a project, which is owner-only: it ends a story rather than moving it. If you add a write, add the session check, and say plainly in the README which of the two rules it follows.
5. **Public movement, private diagnosis.** The whistle line is actorless; the whistle cause never reaches the events table and is never narrated.
6. **No LLM at runtime.** The weekly narrative is deterministic sentence composition over the event log. An LLM pass is post-pilot, cached, and optional; do not add a runtime model dependency.
7. **Voice stays in its lane.** The DFW-informed voice lives in the weekly narrative and the momentum page only. Mechanic microcopy is plain and functional. Vocabulary is limited to words the mechanics earn: rally, catch, drop, assist, hold, whistle.

## Database changes

Generate migrations with `npm run db:generate`, then **apply the SQL directly** (Neon SQL editor or a direct client). Do **not** run `drizzle-kit push` against the live database: its diff has proposed destructive truncates on tables with live unique constraints. This has happened; treat it as a standing hazard.

## Verification pattern

Features here are verified end-to-end by creating temporary fixture users, driving the real forms (server actions through the real pages, not unit shims), asserting on both database state and rendered pages, then **deleting the fixtures**. Backdating timestamps in the database is the accepted way to trigger time-based mechanics (drops at 24h, whistles at 48h). After a deploy, smoke the live routes: all pages should return 200 and `/momentum` should render the feed.

## Current data caveats

Four seeded demo users (Maya Chen, Devon Okafor, Priya Raman, Sam Whitfield) and their `submission_merged` events remain in production so the review console is demonstrable, plus one seeded review + vote by the real user against a demo submission. All of it is scheduled for the roster-ingest swap; do not build on these rows and do not reseed fakes.
