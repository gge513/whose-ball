/**
 * Review detection: the rulebook files reviews as GitHub Issues titled
 * "Review by @{reviewer}" on the reviewee's repo. GitHub already holds the
 * truth, so instead of only trusting a pasted URL, we can go look.
 *
 * Degrades gracefully: nonexistent repos (demo rows), rate limits, and
 * network failures all return { found: false, error } — never a throw.
 */

type IssueHit = { html_url: string; title: string; body?: string | null };

/**
 * The official vote (current program canon) is a public "Vote: up" line
 * kept in the review issue's body — there is no platform ballot and no
 * downvote. Line-anchored so prose mentioning votes doesn't false-positive;
 * tolerates markdown emphasis/quote decoration around the line.
 */
export function bodyHasVoteUp(body: string | null | undefined): boolean {
  if (!body) return false;
  return /(^|\n)[>\s*_#-]*vote\s*:\s*up\b/i.test(body);
}

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
): Promise<{
  found: boolean;
  issueUrl?: string;
  votedUp?: boolean;
  error?: string;
}> {
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
      if (hit)
        return {
          found: true,
          issueUrl: hit.html_url,
          votedUp: bodyHasVoteUp(hit.body),
        };
      if (issues.length < 100) break; // last page
    }
    return { found: false, error: "no matching issue" };
  } catch {
    return { found: false, error: "network error" };
  }
}

/**
 * Check a specific review issue (the pasted-URL path) for the official
 * "Vote: up" line. null = couldn't check (network/rate limit) — callers
 * must treat null as unknown, never as "no vote".
 */
export async function issueHasVoteUp(
  issueUrl: string
): Promise<boolean | null> {
  const m = issueUrl.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)$/
  );
  if (!m) return null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${m[1]}/${m[2]}/issues/${m[3]}`,
      { headers: authHeaders(), next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const issue = (await res.json()) as IssueHit;
    return bodyHasVoteUp(issue.body);
  } catch {
    return null;
  }
}
