# Brainstorm: Whose Ball — Agent-Native PM for the Build Cohort

**Date:** 2026-06-29
**Project:** `whose-ball` (the app) · `~/cursor-contest/whose-ball/`
**For:** Cursor build-cohort contest — "Project Management Build." Everyone builds a PM tool; the cohort votes Friday; **the winner's tool runs the cohort for the rest of the program (~5 more weeks).**
**Status:** Shape committed (pivoted from an agent-relay design once contest facts landed). One blocking fact open — see Open Questions.

---

## The Contest, Read Correctly

- **Who/scale:** ~100 builders, 6-week program, peer-voted.
- **The job:** "track who's shipping what each week + prep for Friday voting calls." Explicitly *skip* Gantt, time tracking, sprint estimation, billing. Don't rebuild Linear/Asana.
- **The real judging axis:** the winner's tool gets *adopted and trusted to run the cohort*. Peers vote for what they'd actually use for 5 more weeks → rewards **dead-simple, fast, lives-next-to-the-code, low-trust-cost.**
- **The bar to beat (GitHub Projects):** "why open another tab?" The code already lives in GitHub.
- **Submission:** merged into a shared cohort repo (the tool itself ships as a PR).
- **Timeline:** winner picked **Friday** — this is a days-long build, not weeks. Scope ruthlessly.

This reframe killed the original design: a multi-agent relay with risk ladders solves *work-execution accountability*, not the contest's problem (*shipping visibility + voting*), and is a trust liability for "run the cohort." Cut.

---

## What We're Building

A **GitHub-fed cohort shipping heartbeat + Friday voting console.** It reads where the work already lives (GitHub) and does the two things the cohort actually needs:

**1. Weekly shipping heartbeat.** Pulls each builder's GitHub activity (merged PRs, commits) and an **agent drafts their "what I shipped this week"** — so a weekly status takes zero effort. Every claim links back to its PR (provenance = trust). Cohort view: at-a-glance who shipped what, who's behind.

**2. Friday voting console.** Aggregates submissions (merged / "trying to win," mirroring the contest's own board), agent-preps a voting digest summarizing each entry, and **runs the vote.** Build this well enough to run *this Friday's actual vote* → a self-fulfilling "winner runs the cohort" demo.

**The whose-ball signature (the name, and the wedge):** your weekly update *is the ball.* It's on you until posted — and you can **pass that ball to the agent**, which drafts it from your merged PRs; you approve or edit. The propose-approve loop survives in one delightful, useful place; the relay/roster/risk-table machinery is gone.

**The one-line pitch:** *GitHub Projects shows you the cards. Whose Ball reads your PRs, writes your weekly update for you, and runs Friday's vote — the only tab that earns being opened.*

---

## Why This Approach

- **Mined from real, proven work.** This is George's `/friday` auto-aggregation pattern (pull from sources → synthesize a weekly brief) re-pointed from Read AI/Gmail to GitHub. The agent-drafts-the-status mechanic is his propose-approve loop (built and run in `session-desk`). Not inventing the hard part.
- **Answers "why another tab" decisively.** It doesn't fork truth from GitHub — it *enriches* it: reads your PRs, writes the status nobody wants to write, and turns Friday voting from a scramble into a console.
- **Adoption-first = vote-winning.** Simple, fast, dogfoodable Friday. The agent is the *useful* differentiator (zero-effort status), not a clever liability.
- **Distinctive without being heavy.** "Whose ball" keeps it unmistakably George's; everyone else ships a kanban.

**Build posture:** Next.js + Claude Agent SDK (rebuilt clean from the session-desk propose-approve pattern) + GitHub API. **Sign in with GitHub** (OAuth) — which itself reinforces "lives where the code lives."

---

## Key Decisions

1. **Pivoted** from agent-relay PM to cohort shipping heartbeat once contest facts landed. Relay machinery cut.
2. **App name = Whose Ball.** The signature mechanic is the name (provisional; can rebrand). Alts considered: Heartbeat, Shipped, Cadence, Tally.
3. **Two pillars:** (1) GitHub-fed weekly shipping heartbeat with agent-drafted updates; (2) Friday voting console that can run the real vote.
4. **Whose-ball mechanic, simplified:** your weekly update is the ball; pass it to the agent; approve/edit. No agent roster, no relay, no risk table.
5. **Source of truth = GitHub** for activity (supersedes the earlier markdown-as-truth call). The tool's *own* artifacts (drafted summaries, vote results) — storage TBD in planning; on-brand option = markdown committed back to a repo.
6. **Agent is the wedge:** drafts each builder's status from real PRs; preps the voting digest. The "it did real work" moment, right-sized.
7. **Provenance:** every ship claim links to its PR.
8. **GitHub OAuth** for sign-in.
9. **Ruthless scope for a Friday deadline** — see guards below.
10. **Lives outside `~/the-foundation/`** at `~/cursor-contest/whose-ball/` — a contest project, not Foundation canon.

---

## Scope Guards (Friday deadline)

- **Cut:** Gantt, time tracking, estimation, billing (per contest), plus real-time multiplayer, granular permissions/roles.
- **Demo with seeded cohort data + a handful of real GitHub accounts** (yours + a few) so the agent's real work shows without needing 100 live users.
- **Two screens only:** the heartbeat board + the voting console. Resist a third.
- **The agent does one job well** (draft the weekly update). Don't add agent roles back.

---

## Open Questions

1. **🚩 BLOCKING — are external LLM/API calls allowed in the contest?** Gates the agent wedge. If banned/sandboxed, the agent-drafts-status feature degrades to the fallback below. Confirm before any code. (Prior: a Cursor AI-builder cohort almost certainly allows this — but confirm, don't assume.)
   - **Fallback if not allowed:** the heartbeat still *assembles* each update deterministically from GitHub (PR titles, merge counts, links, pre-filled template) — you just confirm it; no LLM. The voting console is unchanged (never needed an LLM). Pitch shifts from "the agent writes it" to "it builds your update from GitHub so you only confirm" + voting console + provenance. Less wow, still answers "why another tab."
2. **Friday voting mechanics:** is there a prescribed voting format/call structure the console should match?
3. **Submission/merge process:** the tool ships as a PR to a shared cohort repo — any constraints that shape stack or structure (a template repo, required framework)?
4. **Tool's own-state storage:** markdown-committed-to-repo (on-brand, no DB) vs. a lightweight DB — defer to `/ce:plan`.
5. **Name:** "Whose Ball" stands unless something better lands.

---

## Resume / Next

- **Confirm Open Question #1** (LLM-allowed). Both branches are pre-staged.
- Then `/ce:plan` against this doc to produce the build plan.
- Repo not yet git-init'd — offer open.

---

*Captured in-chat per George's brainstorm on-ramp convention. Contest project held separate from the Foundation; nothing filed to Foundation canon.*
