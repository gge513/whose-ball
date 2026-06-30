# Brainstorm: Whose Ball, Agent-Native PM for the Build Cohort

**Date:** 2026-06-29
**Project:** `whose-ball` (the app) at `~/cursor-contest/whose-ball/`
**For:** Cursor Boston Super Builder cohort (C2, Week 1), the "Project Management Build." Everyone builds a PM tool; the cohort votes Friday; the winner's tool runs the cohort for the rest of the program (~5 more weeks).
**Status:** Shape committed. The one blocking fact (LLM calls allowed?) is now effectively cleared and, by build sequencing, made non-blocking. Ready for planning.

---

## The Contest, Read Correctly

- **Who/scale:** ~100 builders, 6-week program, peer-voted.
- **The job:** "track who's shipping what each week, plus prep for Friday voting calls." Explicitly skip Gantt, time tracking, sprint estimation, billing. Don't rebuild Linear/Asana.
- **The real judging axis:** the winner's tool gets adopted and trusted to run the cohort. Peers vote for what they'd actually use for 5 more weeks, which rewards dead-simple, fast, lives-next-to-the-code, low-trust-cost.
- **The bar to beat (GitHub Projects):** "why open another tab?" The code already lives in GitHub.
- **Timeline:** winner picked Friday. This is a days-long build, not weeks. Scope ruthlessly.

This reframe killed the original design. A multi-agent relay with risk ladders solves work-execution accountability, not the contest's problem (shipping visibility plus voting), and is a trust liability for "run the cohort." Cut.

---

## Contest Mechanics (submission and voting)

These shape the build as hard requirements, not nice-to-haves:

- **Submission = a PR** adding one JSON file to the `c2w1pm-submission` repo, base branch `rogerSuperBuilderAlpha/cursor-boston`, at `content/summer-cohort/c2/w1-pm/submissions/gge513.json`.
- **Required fields:** `repoUrl`, `liveUrl`, `loomUrl`, one-sentence `pitch`, and `competeForWin: true`. Name and photo are pulled from the Cursor Boston profile.
- **DCO sign-off** required on the submission PR: `git commit -s`.
- **Voting = approval voting.** Anyone signed in upvotes any trying-to-win submission; vote for all, some, or none. Most votes at week's end wins.

What this means for strategy:
- **Must deploy** (a real `liveUrl`). Next.js to Vercel.
- **Must record a Loom.** Approval voting rewards broad appeal, so the value has to land in the first ~15 seconds.
- **Approval voting favors "would I happily upvote / would I use this,"** not narrow brilliance. Whose Ball wins by being obviously useful to most builders, not clever to a few.
- **The cohort's own board is just rendered JSON plus upvotes.** Whose Ball's voting console can read those same `submissions/*.json` files and run the vote, making it a drop-in upgrade to the mechanism the cohort uses right now. "Winner runs the cohort" becomes literal and demoable.

---

## What We're Building

A GitHub-fed cohort shipping heartbeat plus a Friday voting console. It reads where the work already lives (GitHub) and does the two things the cohort actually needs:

**1. Weekly shipping heartbeat.** Pulls each builder's GitHub activity (merged PRs, commits). The tool assembles their "what I shipped this week" from that activity, and an agent drafts it into clean prose, so a weekly status takes zero effort. Every claim links back to its PR (provenance equals trust). Cohort view: at-a-glance who shipped what, who's behind.

**2. Friday voting console.** Reads the cohort's submission JSONs (merged / trying-to-win), preps a voting digest summarizing each entry, and runs the vote. Built well enough to run this Friday's actual vote, a self-fulfilling "winner runs the cohort" demo.

**The whose-ball signature (the name and the wedge):** your weekly update is the ball. It's on you until posted, or you pass it to the agent, which drafts it from your merged PRs; you approve or edit. The propose-approve loop survives in one delightful, useful place. The relay/roster/risk-table machinery is gone.

**The one-line pitch:** GitHub Projects shows you the cards. Whose Ball reads your PRs, writes your weekly update for you, and runs Friday's vote: the only tab that earns being opened.

---

## Why This Approach

- **Mined from real, proven work.** This is George's `/friday` auto-aggregation pattern (pull from sources, synthesize a weekly brief) re-pointed from Read AI/Gmail to GitHub. The agent-drafts-the-status mechanic is his propose-approve loop, built and run in `session-desk`. Not inventing the hard part.
- **Answers "why another tab" decisively.** It doesn't fork truth from GitHub, it enriches it: reads your PRs, writes the status nobody wants to write, and turns Friday voting from a scramble into a console.
- **Adoption-first equals vote-winning.** Simple, fast, dogfoodable Friday. The agent is the useful differentiator (zero-effort status), not a clever liability.
- **Distinctive without being heavy.** "Whose ball" keeps it unmistakably George's; everyone else ships a kanban.

**Build posture:** Next.js plus Claude Agent SDK (rebuilt clean from the session-desk propose-approve pattern) plus GitHub API. Sign in with GitHub (OAuth), which itself reinforces "lives where the code lives." Deploy to Vercel.

---

## Key Decisions

1. **Pivoted** from agent-relay PM to cohort shipping heartbeat once contest facts landed. Relay machinery cut.
2. **App name = Whose Ball** (provisional; can rebrand). Alts: Heartbeat, Shipped, Cadence, Tally.
3. **Two pillars:** (1) GitHub-fed weekly shipping heartbeat with agent-drafted updates; (2) Friday voting console that can run the real vote off the cohort's own submission JSONs.
4. **Whose-ball mechanic, simplified:** your weekly update is the ball; pass it to the agent; approve/edit. No agent roster, no relay, no risk table.
5. **Source of truth = GitHub** for activity. The tool's own artifacts (drafted summaries, vote results) storage TBD in planning; on-brand option is markdown committed back to a repo.
6. **LLM is an additive layer, not a foundation.** Build the GitHub ingestion plus deterministic update-assembly first (works with no LLM); the agent draft is a thin layer on top. This makes the "are LLM calls allowed" question non-blocking.
7. **Provenance:** every ship claim links to its PR.
8. **GitHub OAuth** for sign-in. **Deploy to Vercel** for the required live URL.
9. **Lives outside `~/the-foundation/`** at `~/cursor-contest/whose-ball/`, a contest project, not Foundation canon.

---

## Scope Guards (Friday deadline)

- **Cut:** Gantt, time tracking, estimation, billing (per contest), plus real-time multiplayer, granular permissions/roles.
- **Demo with seeded cohort data plus a handful of real GitHub accounts** (yours plus a few) so the agent's real work shows without needing 100 live users.
- **Two screens only:** the heartbeat board and the voting console. Resist a third.
- **The agent does one job well** (draft the weekly update). Don't add agent roles back.

---

## Submission Checklist (required to compete)

- [ ] Public repo on `gge513` (the `repoUrl`).
- [ ] Deployed live URL (Vercel) for `liveUrl`.
- [ ] Loom walkthrough (`loomUrl`), value clear in the first 15 seconds.
- [ ] One-sentence pitch.
- [ ] PR to `c2w1pm-submission` adding `content/summer-cohort/c2/w1-pm/submissions/gge513.json` with the fields above and `competeForWin: true`.
- [ ] `git commit -s` (DCO sign-off) on that PR.

---

## Open Questions

1. **Tool's own-state storage:** markdown-committed-to-repo (on-brand, no DB) vs. a lightweight DB. Defer to `/ce:plan`.
2. **Name:** "Whose Ball" stands unless something better lands.
3. **(Soft, non-blocking) Confirm LLM calls allowed.** Near-certain given a Cursor AI cohort shipping deployed apps; build sequencing (Decision 6) makes it moot regardless.

---

## Resume / Next

- Blocker cleared. Go to `/ce:plan` against this doc to produce the build plan.
- Build order: GitHub ingestion and deterministic assembly first (no LLM), then agent-draft layer, then voting console, then deploy plus Loom.

---

*Captured in-chat per George's brainstorm on-ramp convention. Contest project held separate from the Foundation; nothing filed to Foundation canon.*
