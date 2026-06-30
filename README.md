# Whose Ball

Agent-native project management for the Cursor build cohort.

**The pitch:** GitHub Projects shows you the cards. Whose Ball reads your PRs, writes your weekly ship update for you, and runs Friday's vote: the only tab that earns being opened.

**Two pillars:**
1. **Weekly shipping heartbeat.** Pulls each builder's GitHub activity; an agent drafts their "what I shipped this week" so status is zero-effort. Every claim links to its PR.
2. **Friday voting console.** Reads the cohort's submission JSONs (merged / trying-to-win), preps the voting digest, and runs the vote. A drop-in upgrade to the mechanism the cohort uses now.

**The signature:** your weekly update is the ball. It's on you until posted, or pass it to the agent, which drafts it from your merged PRs; you approve or edit.

---

**Status:** code-complete (Phases 0 to 3). Heartbeat, agent draft + posting, and the voting console are built, building, and linting; the app degrades gracefully without secrets. Remaining: Phase 4 (deploy + Loom + submission PR). Design: [`docs/brainstorms/2026-06-29-whose-ball-brainstorm.md`](docs/brainstorms/2026-06-29-whose-ball-brainstorm.md) · Plan + progress: [`docs/plans/2026-06-29-feat-whose-ball-cohort-pm-plan.md`](docs/plans/2026-06-29-feat-whose-ball-cohort-pm-plan.md).

**Stack:** Next.js 16, Auth.js v5 (GitHub OAuth), GitHub REST search, `@anthropic-ai/sdk` (claude-haiku-4-5), Upstash Redis, deployed to Vercel.

**Run locally:** `cp .env.local.example .env.local`, fill the keys, then `npm install && npm run dev`. Works in a degraded mode even with keys missing.

**Resume (Phase 4):** create the GitHub OAuth app + PAT, add Upstash in Vercel, deploy for the live URL, record the Loom, then open a DCO-signed PR to `c2w1pm-submission` adding `gge513.json`. See the plan's Phase 4 + submission checklist.
