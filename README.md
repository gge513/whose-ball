# Whose Ball

Agent-native project management for the Cursor build cohort.

**The pitch:** GitHub Projects shows you the cards. Whose Ball reads your PRs, writes your weekly ship update for you, and runs Friday's vote: the only tab that earns being opened.

**Two pillars:**
1. **Weekly shipping heartbeat.** Pulls each builder's GitHub activity; an agent drafts their "what I shipped this week" so status is zero-effort. Every claim links to its PR.
2. **Friday voting console.** Reads the cohort's submission JSONs (merged / trying-to-win), preps the voting digest, and runs the vote. A drop-in upgrade to the mechanism the cohort uses now.

**The signature:** your weekly update is the ball. It's on you until posted, or pass it to the agent, which drafts it from your merged PRs; you approve or edit.

---

**Status:** brainstorm complete, ready to plan. Full design and build order: [`docs/brainstorms/2026-06-29-whose-ball-brainstorm.md`](docs/brainstorms/2026-06-29-whose-ball-brainstorm.md).

**Stack (planned):** Next.js, Claude Agent SDK, GitHub API, GitHub OAuth sign-in, deployed to Vercel.

**Next:** `/ce:plan` against the brainstorm. Build order: GitHub ingestion and deterministic assembly first (no LLM dependency), then the agent-draft layer, then the voting console, then deploy plus Loom.
