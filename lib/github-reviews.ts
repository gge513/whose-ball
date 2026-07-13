/**
 * Review detection: the rulebook files reviews as GitHub Issues titled
 * "Review by @{reviewer}" on the reviewee's repo. GitHub already holds the
 * truth, so instead of only trusting a pasted URL, we can go look.
 *
 * Degrades gracefully: nonexistent repos (demo rows), rate limits, and
 * network failures all return { found: false, error } — never a throw.
 */

type IssueHit = { html_url: string; title: string };

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  }
  return headers;
}

export async function findReviewIssue(
  repoUrl: string,
  reviewerLogin: string
): Promise<{ found: boolean; issueUrl?: string; error?: string }> {
  const match = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return { found: false, error: "not a GitHub repo URL" };
  const [, owner, repo] = match;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`,
      { headers: authHeaders(), next: { revalidate: 0 } }
    );
    if (res.status === 404) return { found: false, error: "repo not found" };
    if (!res.ok) return { found: false, error: `GitHub ${res.status}` };

    const issues = (await res.json()) as IssueHit[];
    const wanted = `review by @${reviewerLogin}`.toLowerCase();
    const hit = issues.find((i) => i.title.trim().toLowerCase() === wanted);
    return hit
      ? { found: true, issueUrl: hit.html_url }
      : { found: false, error: "no matching issue" };
  } catch {
    return { found: false, error: "network error" };
  }
}
