---
title: Whose Ball — Agent-Native Cohort PM (Heartbeat + Friday Voting)
type: feat
status: active
date: 2026-06-29
origin: docs/brainstorms/2026-06-29-whose-ball-brainstorm.md
---

# Whose Ball — Agent-Native Cohort PM

✨ A GitHub-fed cohort shipping heartbeat plus a Friday voting console, built for the Cursor Boston Super Builder cohort (C2, Week 1, the "Project Management Build"). Winner's tool runs the cohort for the rest of the program. Deadline: Friday. Submission is a DCO-signed PR adding `gge513.json` to `c2w1pm-submission`, with a public repo, a deployed live URL, a Loom, and a one-sentence pitch.

This plan carries forward the committed design in the origin brainstorm (see brainstorm: `docs/brainstorms/2026-06-29-whose-ball-brainstorm.md`). It resolves the three open decisions that block code, locks the 2026 stack, and sequences the build deterministic-spine-first so the LLM is never on the critical path.

## Overview

Two screens, nothing more:

1. **Weekly shipping heartbeat.** Ingests each builder's merged GitHub PRs for the current week, deterministically assembles a "what I shipped this week" list (titles, repos, PR links), and renders the cohort at a glance: who shipped, who posted, who is quiet. An additive agent layer drafts that list into first-person prose you approve before posting. Every claim links to its PR.
2. **Friday voting console.** Reads the cohort's submission JSONs, renders each trying-to-win entry (face, pitch, links), and runs approval voting (any signed-in user upvotes any/all/none; most votes wins). It can run this week's actual vote, the literal "winner runs the cohort" demo.

**The whose-ball signature:** your weekly update is the ball. It is on you (unposted) until you post it, or you pass it to the agent, which drafts it from your real PRs; you approve or edit, then post.

## Problem Statement / Motivation

The cohort needs to track who is shipping what each week and prep Friday voting. GitHub already holds the truth; the bar to beat (GitHub Projects) is "why open another tab?" Whose Ball earns the tab by *reading your PRs and writing the weekly status nobody wants to write*, and by turning Friday voting from a scramble into a console. Peers vote (approval voting), so the win condition is broad appeal and trust: would a builder happily let this run their cohort. That makes provenance integrity and vote integrity the product, not polish.

## Resolved Decisions (these blocked code)

1. **Own-state storage = Upstash Redis.** Votes as a Redis Set per submission (free dedup + toggle + count); weekly updates as JSON blobs. The on-brand "commit markdown back to a repo" idea is a Loom roadmap talking point, not the v1 mechanism (it would add GitHub write-auth, commit latency, and merge-conflict failure modes to a live demo). Resolves brainstorm Open Q1.
2. **Week definition = America/New_York, Monday 00:00 to Sunday 23:59, filtered on PR `merged_at`.** Computed server-side, displayed in the UI with a "last synced" time. GitHub timestamps are UTC; without a pinned TZ, Friday-evening and Sunday-night PRs land in the wrong week and the board looks broken.
3. **Demo data = snapshotted into the app**, for both GitHub activity and submission JSONs, so neither screen can be blanked by a live API or repo hiccup mid-Loom. A live-read path is a flex to add only if time allows.
4. **Drafting uses plain `@anthropic-ai/sdk` (single-shot), not the Claude Agent SDK.** This is a summary, not a tool-driven agent loop (simplification from the brainstorm's "Agent SDK" wording; the propose-approve UX is what carries over, not multi-step agency).

## Stack (confirmed 2026, with the deltas that matter)

| Concern | Decision | 2026 note |
| --- | --- | --- |
| Framework | Next.js 15, App Router, TypeScript, Tailwind | `create-next-app` |
| Auth | Auth.js v5 (`next-auth@beta`) + GitHub provider | `AUTH_*` env prefix (v4 `NEXTAUTH_*` renamed); config in root `auth.ts`; `auth()` replaces `getServerSession` |
| Persistence | **Upstash Redis** (`@upstash/redis`), via Vercel Marketplace | ⚠️ Vercel KV and Vercel Postgres were sunset Dec 2024 (migrated to Upstash/Neon). Do NOT use `@vercel/kv` or `@vercel/postgres`. |
| GitHub data | REST Search API (`/search/issues`) + server fine-grained PAT | Search bucket is 30 req/min; batch with concurrency ~5. Not GraphQL. |
| AI drafting | `@anthropic-ai/sdk`, model `claude-haiku-4-5`, in a Route Handler | exact model id, no date suffix; guard `content.find(b => b.type === "text")` |
| Deploy | Vercel; secrets in Project Env; `git push` to main = prod | Add the prod `*.vercel.app` callback URL to the GitHub OAuth app after first deploy |

## Architecture

### File structure (target)

```
whose-ball/
├── auth.ts                              # Auth.js v5 config (GitHub provider + jwt/session callbacks for login)
├── app/
│   ├── page.tsx                         # Screen 1: heartbeat board
│   ├── vote/page.tsx                    # Screen 2: voting console
│   ├── api/auth/[...nextauth]/route.ts  # Auth.js handlers
│   ├── api/draft/route.ts               # Anthropic single-shot draft (graceful degrade)
│   └── actions.ts                       # server actions: toggleVote, postUpdate
├── lib/
│   ├── github.ts                        # REST search per handle, batched, field-mapped
│   ├── week.ts                          # NY-TZ Mon-Sun window (merged_at)
│   ├── assemble.ts                      # deterministic PRs -> shipped list (no LLM)
│   └── redis.ts                         # Upstash client + vote/update helpers
├── data/
│   ├── cohort.json                      # seed: [{ handle, repos? }] (configurable source)
│   └── submissions/*.json               # snapshot of cohort submission JSONs
└── docs/{brainstorms,plans}/
```

### The ball state machine (the signature mechanic)

Five states, plus an explicit quiet-week terminal so honest quiet builders never read as delinquent:

```
not-started ──ingest──> ready ──pass to agent──> agent-drafting ──> draft-ready ──approve──> posted
                          │                                                                     ▲
                          └──────────────── edit + post manually (no LLM) ──────────────────────┘
ready (zero PRs) ─────────> quiet-week  (valid, "nothing to report", distinct from not-started)
```

- **Posting is editable until the week boundary** (Friday), not locked, so PRs that merge later in the week can be added. Simpler and safer than an un-post flow.
- Persisted per `(userId, week)`; survives reload; posted vs not-posted is visible in the cohort view.

### Redis key model

```
votes:{submissionId}      -> Set of voterGithubIds   (count = SCARD; toggle = SADD/SREM)
update:{userId}:{week}    -> JSON { assembled, draft?, approved?, status, postedAt? }
sync:{week}               -> JSON { lastSyncedAt, perHandle: {...} }   # snapshot of ingestion
```

### Data flow

GitHub REST search (server, PAT, batched) -> map to `{title, url, repo, mergedAt}` -> snapshot to `sync:{week}` -> `assemble.ts` builds the deterministic shipped list -> board renders with PR links. "Pass to agent" POSTs the assembled list to `/api/draft` -> Haiku prose (or deterministic fallback) -> user edits/approves -> `postUpdate` writes `update:{userId}:{week}` with `status: posted`.

## Implementation Phases

### Phase 0 — Infrastructure and scaffold (create everything now)

- [x] Public GitHub repo created and pushed: https://github.com/gge513/whose-ball
- [x] Next.js 16 (App Router, TS, Tailwind, ESLint) scaffolded over the repo; `docs/`, `README.md`, `.gitignore` preserved.
- [x] Auth.js v5 code skeleton: `auth.ts` (login-exposing callbacks + safe `getSession`), `app/api/auth/[...nextauth]/route.ts`, server-action sign-in/out control. *(George dashboard step below: create the GitHub OAuth app + `AUTH_SECRET`.)*
- [x] `npm i @upstash/redis`; `lib/redis.ts` with vote/update helpers that degrade gracefully with no env. *(George dashboard step below: add the Upstash integration in Vercel.)*
- [ ] **George dashboard step:** import the repo into Vercel; wire env vars (`AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `GITHUB_PAT`, `ANTHROPIC_API_KEY`) for all environments; first deploy to get the `*.vercel.app` URL; add the prod callback URL to the GitHub OAuth app.
- [x] `.env.local.example` committed with all keys; `.env.local` confirmed git-ignored. *(George: create the real `.env.local` from the example to run locally.)*
- [x] Seeded `data/cohort.json` (George + 4 real handles) and `data/submissions/*.json` (incl. a `competeForWin:false` case for the filter test).

**Build + lint + dev smoke all pass with zero secrets present** (home renders signed-out, sign-in button live).

### Phase 1 — Heartbeat spine (deterministic, zero LLM dependency)

- [x] `lib/week.ts`: NY-TZ Mon-Sun window on `merged_at` with correct DST offset; `?week=YYYY-MM-DD` override.
- [x] `lib/github.ts`: REST search per handle, PAT-authenticated (falls back to unauth for local dev), concurrency-pooled to 5, mapped to `{title, url, repo, mergedAt}`, public repos only. Per-handle try/catch yields a "couldn't load" row, never blanks the board.
- [x] Per-load API caching via Next `fetch` `revalidate: 300` (chosen over Redis `sync:{week}` so the read path needs no Redis); render shows the week window + "as of" time.
- [x] `lib/assemble.ts`: group PRs by repo, deterministic shipped-list + summary text (no LLM).
- [x] `app/page.tsx`: cohort grid with avatars, ball-state badge, resolving PR links, explicit quiet-week state, couldn't-load isolation, empty-cohort state.

**Validated live:** all 5 seed members render; real GitHub data (shadcn shipped 5 merged PRs this week); NY window displayed; build + lint pass.

### Phase 2 — Agent layer (additive, gracefully optional)

- [ ] `app/api/draft/route.ts`: Anthropic Haiku single-shot from the assembled PR list. No `ANTHROPIC_API_KEY` or any failure/timeout -> return the deterministic fallback text, never 500.
- [ ] "Pass to agent" -> `agent-drafting` -> `draft-ready`; user edits; approve -> `postUpdate` (server action) -> `posted`, persisted, editable until Friday.
- [ ] If LLM unavailable, the deterministic list is still postable; the agent button shows "drafting unavailable, post your shipped list directly." Loom line: "the agent only drafts from your real merged PRs, and you approve before it posts."

### Phase 3 — Friday voting console

- [ ] `app/vote/page.tsx`: load `data/submissions/*.json`; per-file try/catch (skip-and-log a malformed file, render the rest); filter `competeForWin === true` (strict). Field fallbacks: missing photo -> initials avatar; missing loom/live -> hide that link (no dead button); missing pitch -> repo name.
- [ ] `toggleVote` server action -> Redis Set keyed on the authenticated GitHub user id; unique by construction; toggle decrements; count = `SCARD`. Self-vote allowed and shown honestly. Count reflects committed server state (no optimistic drift on failed write).
- [ ] Voting requires sign-in; logged-out users can view; the upvote action prompts sign-in. Empty states: zero submissions, zero votes.
- [ ] [CUT-FIRST] Optional agent-prepped voting digest. Ship without it if Friday is tight.

### Phase 4 — Ship the submission

- [ ] Seed realistic demo data (PRs dated in the demo week, or use `?week=`); spot-check for dependabot/bot PRs masquerading as "shipped."
- [ ] Final deploy; verify: sign-in works on the live URL (not just localhost), PR links resolve, vote toggle survives reload and rapid re-click (server-enforced), every empty state renders.
- [ ] Record the Loom (value clear in the first 15 seconds; desktop; close on "this already runs this week's vote").
- [ ] Write the one-sentence pitch.
- [ ] Fork `c2w1pm-submission`, add `content/summer-cohort/c2/w1-pm/submissions/gge513.json` (`repoUrl`, `liveUrl`, `loomUrl`, `pitch`, `competeForWin: true`), open the PR with **`git commit -s`** (DCO). Base branch `rogerSuperBuilderAlpha/cursor-boston`.

## Acceptance Criteria (gradeable by a stranger)

**Heartbeat**
- [ ] N seed handles -> N rows; a zero-PR handle shows a distinct quiet-week state (not error, not omitted).
- [ ] A 404/typo handle shows one "couldn't load" row; the other rows render normally.
- [ ] "This week" = a single fixed-TZ Mon-Sun window on `merged_at`; the window and a "last synced" time are visible.
- [ ] Every shipped claim links to a PR URL that resolves; private-repo activity is excluded (stated, not silent).
- [ ] GitHub calls are authenticated and snapshotted; reloading does not re-hit the API per load and never 403s the render.
- [ ] "Pass to agent" drafts from the deterministic list; user edits, approves, posts. With no API key, the deterministic list is still postable and the button degrades visibly.
- [ ] Ball reaches `posted`, persists across reload; posted vs not-posted visible in the cohort view.

**Voting**
- [ ] Console renders only `competeForWin === true`; a malformed JSON file is skipped without blanking the page; cards with missing photo/loom/live/pitch render with fallbacks and no dead buttons.
- [ ] Voting requires sign-in; logged-out can view but upvote prompts sign-in.
- [ ] One user upvotes a submission at most once; re-click toggles off and decrements; count reflects committed server state after reload; self-vote behavior is defined and consistent.
- [ ] Counts stay correct under rapid re-click / simulated double-submit (server-enforced uniqueness).

**Auth / deploy**
- [ ] OAuth denied/cancelled returns to a usable page with retry.
- [ ] Sign-in works on the submitted live Vercel URL, not only localhost.

## System-Wide Impact

- **Failure isolation:** every external read (per GitHub handle, per submission JSON, the LLM call) is independently guarded; one failure degrades one row/card, never the page. This is a hard requirement, not defensive nicety, because empty/broken states are disproportionately visible in a short Loom.
- **Vote integrity (state lifecycle):** the Redis Set makes "one approval per voter per submission" true by construction; toggle is `SADD`/`SREM`; count is `SCARD`. No hand-rolled read-modify-write, so concurrent voters cannot double-count.
- **Provenance:** public-repos-only keeps every PR link resolvable for any viewer; a private-repo link would 404 and break the exact trust claim being sold.
- **LLM as additive layer:** the `posted` state is reachable with zero LLM. If LLM calls turn out to be disallowed or flaky, the product still works; the agent draft is pure upside.

## Risks and Mitigation

| Risk | Mitigation |
| --- | --- |
| Vercel KV/Postgres assumed to exist (deprecated) | Confirmed; using Upstash Redis from the Marketplace |
| GitHub Search rate limit (30/min) blanks the board | Authenticated PAT + concurrency ~5 + snapshot, not live-on-load |
| Wrong-week PRs from TZ drift | Pinned NY-TZ Mon-Sun on `merged_at`, displayed |
| LLM slow/hangs on the live Loom | Timeout + deterministic fallback; never on the post critical path |
| Live cohort repo unavailable mid-demo | Snapshot submissions into the app; live-read only as a flex |
| OAuth works locally, fails on live URL | Add the prod `*.vercel.app` callback URL post-first-deploy (Phase 0 + Phase 4 check) |
| Scope creep beyond two screens | Hard cut list below; the voting digest is the first thing to drop |

## Scope Guards (cut for Friday)

Cut: Gantt, time tracking, estimation, billing, real-time multiplayer, granular roles/permissions, mobile/responsive polish, vote audit/voter lists, automated vote-close, PR pagination (>30/week), bot/fork/squash edge handling, the agent voting digest. Two screens only.

## Sources and References

### Origin
- **Brainstorm:** `docs/brainstorms/2026-06-29-whose-ball-brainstorm.md`. Carried-forward decisions: two-pillar heartbeat + voting console; whose-ball as the signature; LLM as an additive layer (Decision 6); deterministic-first build order; lives outside the Foundation.

### Confirmed stack (external research, 2026)
- Auth.js v5: https://authjs.dev/getting-started/migrating-to-v5 · https://authjs.dev/reference/nextjs
- Redis/Storage on Vercel (Upstash): https://vercel.com/docs/redis · https://vercel.com/marketplace/upstash
- Postgres-on-Vercel transition (Neon): https://neon.com/docs/guides/vercel-postgres-transition-guide
- Anthropic SDK + model id `claude-haiku-4-5`: bundled `claude-api` skill reference.

### Flow analysis
- spec-flow-analyzer pass (2026-06-29): five-state ball machine, TZ/vote-integrity/failure-isolation MUSTs, the gradeable acceptance criteria above.

### Open (non-blocking)
- Confirm LLM calls allowed in the contest (near-certain; build order makes it moot).
- Name "Whose Ball" stands unless something better lands.
