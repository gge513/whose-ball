# Whose Ball

> "Beauty is not the goal of competitive sports, but high-level sports are a prime venue for the expression of human beauty."
> — David Foster Wallace, "Federer as Religious Experience"

**Live:** https://whose-ball.vercel.app

## The thesis

What conditions help capable people repeatedly turn intention into shipped work, especially when the work is difficult, voluntary, social, and time-constrained? This platform is the practical expression of an answer:

**Make meaningful progress easier to see than unfinished work, and make the next useful action easier to choose than avoidance.**

This is not a better container for tasks. It is an operating system for turning intention into shared, visible, verifiable progress. The one number it exists to move: the percentage of participants who always know, and complete, their next shippable action.

Five conditions, each shipped as a mechanic, none as decoration: meaning (every project can say who benefits and what done looks like), agency (the platform never assigns or commands), mastery (feedback is actionable, never a verdict), momentum (the unit of work is the next shippable movement), and mutuality (the social consequence of work is visible without surveillance).

## The tour: six decisions, shipped

**1. Projects travel, tasks flow.** Every project rides a six-stage trajectory: Define → Commit → Build → Verify → Ship → Teach. Quality and knowledge transfer are stations of the work, not cleanup after done. Tasks ride a light flow inside (todo / building / verifying / done). Ceremony lives at the altitude where narrative exists. And Define gates the story, never the work: project creation is instant and name-only, tasks move regardless of stage, and the three meaning questions (who benefits, what changes, what does done look like) are answered to advance out of Define, not to start working.

**2. The ball is a button.** Every project carries exactly one named next action and one person holding it. On your command center (`/me`, the front door) it is a click-through into where the work lives. Procrastination is mostly an undefined next action; the ball makes sure there always is one, and that it is yours or it isn't.

**3. The rally.** The signature mechanic. Passing the ball puts it *in the air*; it becomes the receiver's only when they catch it by naming their first action, one field. Uncaught for 24 hours, it drops: visible, no-fault, and the ball returns to the passer. Projects carry a rally count of consecutive clean catches, and the feed witnesses catch latency in its own language ("caught in 90 minutes"), never as points. The failure mode this attacks is the illusion of communication: a handoff both sides believe happened. Nobody drops the ball on purpose; they never felt it land in their hands.

**4. Blocked is honest work, and the save is scored.** Entering blocked asks three things: what you tried, what you need, who can unblock you. The named unblocker sees it in their possession view on `/me` (the balls and blockers others are waiting on, ranked by wait time, private, never scored). When the blocker clears, an **assist** logs to the unblocker; when the unblocked task ships, the assist converts. Organizations reward firefighters and make prevention invisible; here the save is the scored act.

**5. The whistle.** A held ball motionless for 48 hours draws the referee: one actorless line in the feed (movement is public), a one-tap cause asked privately of the holder (diagnosis is not), and a remedy routed to the cause: define it inline, split it into a smaller task, ask for help, name the unblocker, or link the evidence that it actually moved. The intervention matches the cause, because treating all stalled work the same is how tools turn into judgment.

**6. Momentum, not rank.** `/momentum` is the cohort in one glance: collective tiles (projects live, longest live rally, median catch time this week) over a shipping feed of real events. Movement is public; comparison does not exist anywhere. Each member's page carries a weekly narrative: a composed match report per week, own motion first, the people they moved second, one collective clause to close. It is written by deterministic sentence rules over the event log, no LLM at runtime, because these are facts about real people.

## Anti-features (as binding as the features)

No activity leaderboards. No points, XP, or badges: visualize progress, do not manufacture importance. No status reporting rituals: updates emerge from real actions. No public tallies of any kind: the ballot is private, review-gated, and votes never emit feed events. Progress, not applause.

## Signing in

Two doors into the same account table:

- **GitHub OAuth**, one click (cohort members all have GitHub by definition).
- **Email + password**, open registration at `/signup` (staff test accounts work this way; reviewer accounts available on request).

## Fresh-clone setup

Prereqs: Node 20+, a Postgres database (built against [Neon](https://neon.tech); any Postgres connection string works).

```
git clone <this repo> && cd whose-ball
cp .env.local.example .env.local   # fill the five values, see comments
npm install
# apply migrations in order (drizzle/0000 ... 0005) against your DATABASE_URL,
# e.g. paste each file into the Neon SQL editor. Do NOT use `drizzle-kit push`
# against a live database: its diff can propose destructive truncates.
npm run dev
```

Env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` (a GitHub OAuth app with callback `<origin>/api/auth/callback/github`), `GITHUB_PAT` (read-only, for review-issue detection). Email+password auth works without the GitHub pair if you just want to look around locally.

## Architecture

```
Browser
   │
   ▼
Next.js 16 (App Router, React server components) ── Vercel
   │
   ├─ pages (reads)          /me  /projects  /tasks  /review  /momentum  /members/[id]
   │                          └─ journey header on every page (phase · countdown · your standing)
   │
   ├─ server actions (the only write path; every write authenticates,
   │    then emits at most one event at the real transition)
   │
   ├─ lazy sweeps on page load (no cron): rally drops, dead-ball whistles
   │
   └─ Auth.js v5 (GitHub OAuth + credentials, one users table)
   │
   ▼
Neon Postgres (Drizzle ORM)
   ├─ state:  users · projects · tasks · submissions · reviews · votes
   └─ log:    events (append-only; the feed and the weekly narrative
              both read from it; votes deliberately never write to it)
```

The two-table philosophy: state tables answer "where are things now," the event log answers "what happened, when." Everything social (feed, tiles, narrative, assists) reads the log; nothing ever reads the ballot.

## Known limitations

- The four visible cohort members are **seeded demo rows** (Maya, Devon, Priya, Sam), kept so the review console is demonstrable; they get swapped for the real roster as it lands.
- Review-week standing (`reviews x/N · votes x/N` in the journey header) goes live when the phase flips; the query is in place.
- `lib/github-reviews.ts` review-issue detection matches the pre-pilot title format; updating to the live `Review by @{me}: @{peer}` format is queued.
- The weekly narrative addresses every reader in the third person, deliberately but provisionally; the subject is a parameter, so second-person-on-your-own-page is a small change if lived use argues for it.
- Post-pilot roadmap: real-roster ingest, an optional cached LLM polish pass over the narrative, a season table, help-matching for blockers, richer drop causes.

## Docs

The product thesis is [`docs/THESIS.md`](docs/THESIS.md). The verified requirements and the build-state cursor live in [`docs/plans/2026-07-12-pilot-v2-requirements-delta.md`](docs/plans/2026-07-12-pilot-v2-requirements-delta.md). Agent working notes: [`AGENTS.md`](AGENTS.md).
