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

  // Real filings carry suffixes — the program's own staff titles issues
  // "Review by @handle (phase-1-project-3)" — so the match is prefix plus
  // a boundary: "@alice" must not match "@alice2". GitHub logins are
  // alphanumerics and hyphens, so any other character (or end) is a boundary.
  const wanted = `review by @${reviewerLogin}`.toLowerCase();
  const matches = (title: string) => {
    const t = title.trim().toLowerCase();
    if (!t.startsWith(wanted)) return false;
    const rest = t.slice(wanted.length);
    return rest === "" || !/^[a-z0-9-]/.test(rest);
  };

  try {
    // The /issues endpoint counts PRs against per_page, so a busy repo can
    // push review issues past page one — walk a few pages before giving up.
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`,
        { headers: authHeaders(), next: { revalidate: 0 } }
      );
      if (res.status === 404) return { found: false, error: "repo not found" };
      if (!res.ok) return { found: false, error: `GitHub ${res.status}` };

      const issues = (await res.json()) as IssueHit[];
      const hit = issues.find((i) => matches(i.title));
      if (hit) return { found: true, issueUrl: hit.html_url };
      if (issues.length < 100) break; // last page
    }
    return { found: false, error: "no matching issue" };
  } catch {
    return { found: false, error: "network error" };
  }
}
