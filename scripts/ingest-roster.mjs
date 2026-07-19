/**
 * Roster ingest: pull the cohort's merged Project-1 submissions from the
 * course repo into this app's production database, so the review console
 * has the real cohort in it.
 *
 * Source of truth is the merged PRs against the program's project branch
 * (author login, merge timestamp), not the submission filenames — those
 * are too messy to parse reliably. File content supplies repo + live URLs.
 *
 * Idempotent and rerunnable: users upsert on github_login (never clobbers
 * a claimed account — OAuth sign-in later adopts the row), submissions
 * upsert on user_id, feed events dedupe per actor. Run it again after the
 * Sunday 17:00 ET merge deadline to sweep late submissions.
 *
 * Usage: node scripts/ingest-roster.mjs [--dry-run]
 * Needs: gh CLI authenticated; DATABASE_URL in .env.local (prod guard:
 * refuses any database whose path is not /neondb).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const COURSE_REPO = "rogerSuperBuilderAlpha/hult-cohort-program";
const PROJECT_BRANCH = "projects/summer26/phase-1-project-1";
const DRY_RUN = process.argv.includes("--dry-run");

const envLine = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="));
if (!envLine) throw new Error("DATABASE_URL not found in .env.local");
const dbUrl = new URL(envLine.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, ""));
if (dbUrl.pathname !== "/neondb") {
  throw new Error(`refusing: expected the prod database /neondb, got ${dbUrl.pathname}`);
}
const sql = neon(dbUrl.href);
const rows = (r) => r.rows ?? r;

const gh = (args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

// 1. Merged PRs on the project branch — one submission per author, latest merge wins.
const prs = JSON.parse(
  gh([
    "pr", "list", "--repo", COURSE_REPO, "--base", PROJECT_BRANCH,
    "--state", "merged", "--limit", "200", "--json", "number,author,mergedAt,files",
  ])
);
const byAuthor = new Map();
for (const pr of prs) {
  const login = pr.author?.login;
  if (!login || pr.author?.is_bot) continue;
  const prev = byAuthor.get(login);
  if (!prev || pr.mergedAt > prev.mergedAt) byAuthor.set(login, pr);
}
console.log(`${prs.length} merged PRs → ${byAuthor.size} participants`);

// 2. Per participant: parse their submission file for repo + live URLs.
function parseUrls(text) {
  // strip markdown link syntax down to bare URLs before scanning; trailing
  // punctuation and markdown emphasis (**bold**) ride along when copied
  const urls = [...text.matchAll(/https:\/\/[^\s)\]>"'`]+/g)].map((m) =>
    m[0].replace(/[.,;:!?*_]+$/, "")
  );
  const repo = urls.find(
    (u) =>
      /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(u.replace(/\.git$/, "")) &&
      !u.includes("hult-cohort-program")
  );
  const live = urls.find((u) => !u.startsWith("https://github.com/"));
  return {
    repo: repo?.replace(/\.git$/, "").replace(/\/$/, "") ?? null,
    live: live ?? null,
  };
}

/**
 * Choose THIS author's submission path from a PR's file list. Fork-sync
 * mess PRs touch other people's files, so prefer the path whose top
 * segment resembles the author's login; fall back to the first
 * submissions/ path only when the PR is small enough to trust.
 */
function submissionPathFor(login, files) {
  const paths = (files ?? []).map((f) => f.path).filter((p) => p.startsWith("submissions/"));
  const slug = login.toLowerCase().replace(/[^a-z0-9]/g, "");
  const topSegs = [...new Set(paths.map((p) => p.split("/")[1]))];
  const mine = topSegs.find((seg) =>
    seg.toLowerCase().replace(/[^a-z0-9]/g, "").includes(slug)
  );
  if (mine) {
    const underMine = paths.filter((p) => p.split("/")[1] === mine);
    // a lone .md file, or a directory (any deeper path)
    return { top: `submissions/${mine}`, isDir: underMine.some((p) => p.split("/").length > 2) };
  }
  if (paths.length && files.length <= 20) {
    const top = paths[0].split("/")[1];
    return { top: `submissions/${top}`, isDir: paths.some((p) => p.split("/").length > 2) };
  }
  return null;
}

function fetchRaw(path) {
  return gh([
    "api", `repos/${COURSE_REPO}/contents/${path}?ref=${PROJECT_BRANCH}`,
    "-H", "Accept: application/vnd.github.raw+json",
  ]);
}

// Top-level submissions/ listing on the branch, for PR-attribution fallback.
const branchListing = JSON.parse(
  gh(["api", `repos/${COURSE_REPO}/contents/submissions?ref=${PROJECT_BRANCH}`])
).map((e) => ({ name: e.name, path: e.path, type: e.type }));

const ingested = [];
const skipped = [];
for (const [login, pr] of byAuthor) {
  let sub = submissionPathFor(login, pr.files);
  if (!sub) {
    // Fork-sync mess PRs bury the author's path — fall back to matching
    // the branch's own top-level submissions/ listing against the login.
    const slug = login.toLowerCase().replace(/[^a-z0-9]/g, "");
    const entry = branchListing.find((e) =>
      e.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(slug)
    );
    if (entry) sub = { top: entry.path, isDir: entry.type === "dir" };
  }
  let urls = { repo: null, live: null };
  if (sub) {
    // A file submission is read directly; a vendored-app folder is read
    // via the READMEs inside it.
    const candidates = sub.isDir
      ? [`${sub.top}/README.md`, `${sub.top}/readme.md`, `${sub.top}/SUBMISSION.md`]
      : [sub.top];
    for (const path of candidates) {
      try {
        urls = parseUrls(fetchRaw(path));
      } catch {
        continue;
      }
      if (urls.repo || urls.live) break;
    }
  }
  if (!urls.repo && sub) {
    // Vendored-app submission: no separate source repo exists. Point at
    // the true home of their code — the folder on the program branch.
    // Detection no-ops gracefully on a non-root URL; Sunday's rerun
    // refreshes repo_url if they fix their submission.
    urls.repo = `https://github.com/${COURSE_REPO}/tree/${PROJECT_BRANCH}/${sub.top}`;
  }
  if (!urls.repo) {
    skipped.push({ login, pr: pr.number, reason: "no attributable submissions/ path in PR" });
    continue;
  }
  // 3. Real display name + avatar from the GitHub profile.
  let name = login, avatar = null;
  try {
    const profile = JSON.parse(gh(["api", `users/${login}`]));
    if (profile.name) name = profile.name;
    avatar = profile.avatar_url ?? null;
  } catch {
    /* handle-as-name fallback */
  }
  ingested.push({ login, name, avatar, mergedAt: pr.mergedAt, ...urls });
}

console.log(`parsed ${ingested.length}, skipped ${skipped.length}`);
for (const s of skipped) console.log(`  SKIPPED ${s.login} (PR #${s.pr}): ${s.reason}`);
if (DRY_RUN) {
  for (const p of ingested) console.log(`  ${p.login} → ${p.repo} (${p.live ?? "no live URL"}) merged ${p.mergedAt}`);
  process.exit(0);
}

// 4. Upserts, in FK order. Users never clobber; submissions refresh; events dedupe.
let newUsers = 0, newEvents = 0;
for (const p of ingested) {
  const inserted = rows(
    await sql.query(
      `INSERT INTO users (github_login, name, avatar_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (github_login) DO NOTHING
       RETURNING id`,
      [p.login, p.name, p.avatar]
    )
  );
  if (inserted.length) newUsers++;
  const [{ id: userId }] = rows(
    await sql.query(`SELECT id FROM users WHERE github_login = $1`, [p.login])
  );
  await sql.query(
    `INSERT INTO submissions (user_id, repo_url, live_url, merged_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET repo_url = EXCLUDED.repo_url,
           live_url = EXCLUDED.live_url,
           merged_at = EXCLUDED.merged_at`,
    [userId, p.repo, p.live, p.mergedAt]
  );
  const existing = rows(
    await sql.query(
      `SELECT 1 FROM events WHERE kind = 'submission_merged' AND actor_id = $1 LIMIT 1`,
      [userId]
    )
  );
  if (!existing.length) {
    await sql.query(
      `INSERT INTO events (kind, actor_id, created_at) VALUES ('submission_merged', $1, $2)`,
      [userId, p.mergedAt]
    );
    newEvents++;
  }
}

const totals = rows(
  await sql.query(
    `SELECT (SELECT count(*)::int FROM users) users,
            (SELECT count(*)::int FROM submissions) submissions,
            (SELECT count(*)::int FROM events WHERE kind='submission_merged') merge_events`
  )
);
console.log(
  `done: +${newUsers} users, +${newEvents} merge events · prod now ${JSON.stringify(totals[0])}`
);
