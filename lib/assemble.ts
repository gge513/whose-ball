import type { PullRequest } from "@/lib/github";

/**
 * Deterministic "what I shipped this week" assembly. No LLM. This is the spine
 * (plan Decision 6): the update is buildable and postable with zero LLM
 * dependency; the agent draft is an additive layer over this text.
 */

export type RepoGroup = { repo: string; prs: PullRequest[] };

export type AssembledUpdate = {
  count: number;
  byRepo: RepoGroup[];
  /** Plain-text deterministic summary, postable as-is and fed to the agent. */
  text: string;
  /** True when there is no merged-PR activity this week (valid, not behind). */
  quiet: boolean;
};

export function assembleUpdate(prs: PullRequest[]): AssembledUpdate {
  const count = prs.length;
  if (count === 0) {
    return { count: 0, byRepo: [], text: "", quiet: true };
  }

  const groups = new Map<string, PullRequest[]>();
  for (const pr of prs) {
    const key = pr.repo || "other";
    const list = groups.get(key) ?? [];
    list.push(pr);
    groups.set(key, list);
  }

  const byRepo: RepoGroup[] = Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([repo, list]) => ({ repo, prs: list }));

  const repoCount = byRepo.length;
  const lead =
    `This week I shipped ${count} change${count === 1 ? "" : "s"} ` +
    `across ${repoCount} repo${repoCount === 1 ? "" : "s"}: ` +
    byRepo
      .map((g) => `${g.repo} (${g.prs.length})`)
      .join(", ") +
    ".";

  return { count, byRepo, text: lead, quiet: false };
}
