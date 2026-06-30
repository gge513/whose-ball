import type { WeekWindow } from "@/lib/week";

/**
 * GitHub ingestion: each cohort member's MERGED pull requests within the week
 * window, via the REST Search API (plan: REST not GraphQL). Authenticated with
 * a server-side PAT for the 30 req/min search bucket. Public repos only, so the
 * provenance links always resolve for any viewer.
 *
 * Per-member failures are isolated: one bad handle yields an `error` on that
 * member, never a thrown page render (spec-flow MUST).
 */

export type PullRequest = {
  title: string;
  url: string;
  repo: string; // "owner/repo"
  mergedAt: string | null;
};

export type MemberActivity = {
  handle: string;
  name?: string;
  prs: PullRequest[];
  error?: string;
};

export type CohortMember = { handle: string; name?: string };

const CONCURRENCY = 5;

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  }
  return headers;
}

async function searchMergedPRs(
  handle: string,
  window: WeekWindow,
): Promise<PullRequest[]> {
  const q = `is:pr is:merged author:${handle} merged:${window.queryRange}`;
  const url =
    `https://api.github.com/search/issues?q=${encodeURIComponent(q)}` +
    `&per_page=50&sort=updated&order=desc`;

  const res = await fetch(url, {
    headers: authHeaders(),
    // Cache so reloading the board does not re-hit the API per load.
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const reset = res.headers.get("x-ratelimit-remaining");
    throw new Error(
      res.status === 403 && reset === "0"
        ? "GitHub rate limit (add GITHUB_PAT)"
        : `GitHub ${res.status}`,
    );
  }

  const data = (await res.json()) as { items?: GitHubSearchItem[] };
  return (data.items ?? []).map((item) => ({
    title: item.title,
    url: item.html_url,
    repo: item.repository_url.split("/repos/")[1] ?? "",
    mergedAt: item.pull_request?.merged_at ?? null,
  }));
}

type GitHubSearchItem = {
  title: string;
  html_url: string;
  repository_url: string;
  pull_request?: { merged_at?: string | null };
};

/** Run tasks with a small concurrency cap (search bucket is 30/min). */
async function pooled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export async function ingestCohort(
  members: CohortMember[],
  window: WeekWindow,
): Promise<MemberActivity[]> {
  return pooled(members, CONCURRENCY, async (member) => {
    try {
      const prs = await searchMergedPRs(member.handle, window);
      return { handle: member.handle, name: member.name, prs };
    } catch (e) {
      return {
        handle: member.handle,
        name: member.name,
        prs: [],
        error: e instanceof Error ? e.message : "could not load",
      };
    }
  });
}
