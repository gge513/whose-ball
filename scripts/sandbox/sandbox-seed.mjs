// Seed the whose_ball_sandbox DB with a realistic pilot-week supporting cast.
// George's account is staged so every mechanic has a live instance waiting:
// a held ball, a Define gate, a whistled project (pickup card), a ball in
// the air to catch, and a blocked task naming him unblocker.
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const SANDBOX_DB = "whose_ball_sandbox";
const REPO = "/Users/georgeeastwood/cursor-course/whose-ball";

const prodUrl = readFileSync(`${REPO}/.env.local`, "utf8")
  .split("\n").find((l) => l.startsWith("DATABASE_URL="))
  .slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
const url = new URL(prodUrl);
url.pathname = `/${SANDBOX_DB}`;
if (url.pathname !== `/${SANDBOX_DB}`) throw new Error("sandbox URL guard failed");
const sql = neon(url.href);

// Refuse to seed a non-empty DB (idempotence guard: rerun = recreate first).
const [{ n }] = (await sql.query(`SELECT count(*)::int AS n FROM users`)).rows ?? (await sql.query(`SELECT count(*)::int AS n FROM users`));
if (n > 0) throw new Error(`users table not empty (${n}) — run sandbox-setup.mjs first for a clean slate`);

const now = Date.now();
const H = 3600_000;
const at = (hoursAgo) => new Date(now - hoursAgo * H).toISOString();

const hash = bcrypt.hashSync("pilot-sandbox", 10);

async function insert(table, cols, rows) {
  const out = [];
  for (const row of rows) {
    const params = row.map((v) => v);
    const ph = row.map((_, i) => `$${i + 1}`).join(", ");
    const r = await sql.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${ph}) RETURNING id`,
      params
    );
    out.push((r.rows ?? r)[0].id);
  }
  return out;
}

// ---- users ----
const [george, maya, devon, priya, sam, lena, marcus] = await insert(
  "users",
  ["email", "github_login", "name", "password_hash", "created_at"],
  [
    ["george@emilywhiteheadfoundation.org", null, "George Eastwood", hash, at(130)],
    [null, "mayachen-dev", "Maya Chen", null, at(129)],
    [null, "devokafor", "Devon Okafor", null, at(128)],
    [null, "priyaraman", "Priya Raman", null, at(127)],
    [null, "samwhitfield", "Sam Whitfield", null, at(120)],
    [null, "lenarossi", "Lena Rossi", null, at(118)],
    [null, "marcushale", "Marcus Hale", null, at(117)],
  ]
);

// ---- projects ----
const P = "projects";
const pcols = [
  "name", "owner_id", "stage", "who_benefits", "what_changes", "done_looks_like",
  "next_action", "ball_holder_id", "ball_passed_at", "ball_passer_id",
  "rally_count", "whistle_blown_at", "archived_at", "created_at", "updated_at",
];
const [bundles, boardpack, fieldguide, radio, grants, logo, mentor] = await insert(P, pcols, [
  // 1. George's live project: held ball, recent motion, gate filled.
  ["Believe Bundles inventory tracker", george, "build",
   "Jodi's volunteer network — they lose hours to guesswork about what's on the shelf",
   "Every packing session starts from a live count instead of a walk-through",
   "Jodi runs one full packing session without asking anyone what's in stock",
   "Draft reorder thresholds for the top 10 items", george, null, null,
   0, null, null, at(126), at(2)],
  // 2. George's whistled project: define stage, gate empty, still since Tue.
  ["Board pack automation", george, "define",
   null, null, null,
   null, george, null, null,
   0, at(20), null, at(105), at(75)],
  // 3. Maya's project with the ball IN THE AIR to George (passed 3h ago).
  ["Cohort field guide", maya, "build",
   "New cohort members who arrive mid-season",
   "Week-one confusion becomes a 20-minute read",
   "A newcomer ships their first task within 48 hours of joining",
   null, george, at(3), maya,
   2, null, null, at(122), at(3)],
  // 4. Devon's whistled project (not George's — visible, not actionable by him).
  ["Standup radio", devon, "verify",
   "Members who miss the live standup",
   "Standups become a 5-minute podcast anyone can replay",
   "Three straight days of episodes published within an hour of standup",
   "Cut the episode template to 90 seconds", devon, null, null,
   1, at(30), null, at(121), at(80)],
  // 5. Priya's shipped project, submission merged.
  ["Grant pipeline map", priya, "ship",
   "Small nonprofits chasing federal grants without a development office",
   "Scattered deadlines become one visual pipeline",
   "Five real orgs load their pipeline and two say they'd use it weekly",
   "Write the teach-week walkthrough", priya, null, null,
   3, null, null, at(115), at(20)],
  // 6. Sam's archived project.
  ["Logo sprint", sam, "build",
   "The cohort's project pages", "Placeholder headers get real identity", "Six projects sport a shipped mark",
   null, null, null, null,
   0, null, at(50), at(110), at(50)],
  // 7. Lena's rally showcase + the blocked task naming George unblocker.
  ["Mentor match", lena, "build",
   "First-time builders in the cohort",
   "Asking for guidance stops being a cold DM",
   "Every member has one named mentor and one named mentee",
   "Re-run pairings once the criteria are reviewed", lena, null, null,
   5, null, null, at(114), at(26)],
]);

// ---- tasks ----
const tcols = [
  "project_id", "title", "description", "status", "assignee_id", "definition_of_done",
  "blocked_what_tried", "blocked_what_needed", "blocked_unblocker_id", "blocked_at",
  "created_at", "updated_at",
];
const [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10] = await insert("tasks", tcols, [
  [bundles, "Photograph current inventory", "One photo per shelf, phone is fine", "done", george,
   "Every shelf has a dated photo in the shared album", null, null, null, null, at(100), at(28)],
  [bundles, "Label shelving zones", null, "building", george,
   "Zones A–F labeled and matching the photo album", null, null, null, null, at(76), at(2)],
  [bundles, "Draft reorder thresholds", "Start with the top 10 items by volume", "todo", george,
   "A one-page table Kristine can act on without asking a question", null, null, null, null, at(75), at(75)],
  [fieldguide, "Interview three members", null, "done", maya,
   "Three 15-minute calls, notes filed", null, null, null, null, at(120), at(52)],
  [fieldguide, "Outline chapter list", null, "building", maya, null,
   null, null, null, null, at(51), at(24)],
  [radio, "Record pilot jingle", null, "verifying", devon, null,
   null, null, null, null, at(96), at(81)],
  [radio, "Wire RSS output", null, "todo", marcus, null,
   null, null, null, null, at(95), at(95)],
  [grants, "Publish funder one-pagers", null, "done", priya,
   "Ten one-pagers live on the site", null, null, null, null, at(90), at(44)],
  [mentor, "Match round one pairings", null, "blocked", lena, null,
   "Drafted pairings from the intake sheet twice; both rounds left three people unmatched",
   "A second pair of eyes on the matching criteria before I re-run it",
   george, at(26), at(70), at(26)],
  [mentor, "Send intake form", null, "done", lena,
   "Every member has the form; 80% responses in", null, null, null, null, at(90), at(48)],
]);

// ---- submissions ----
await insert("submissions",
  ["user_id", "repo_url", "live_url", "merged_at", "created_at"],
  [
    [priya, "https://github.com/priyaraman/grant-pipeline-map", "https://grant-pipeline-map.vercel.app", at(28), at(30)],
    [sam, "https://github.com/samwhitfield/logo-sprint", "https://logo-sprint.vercel.app", at(8), at(9)],
    [maya, "https://github.com/mayachen-dev/cohort-field-guide", "https://cohort-field-guide.vercel.app", at(6), at(7)],
    [george, "https://github.com/gge513/whose-ball", "https://whose-ball.vercel.app", at(4), at(5)],
    [devon, "https://github.com/devokafor/standup-radio", null, null, at(10)],
  ]
);

// ---- events (append-only shipping log, oldest first) ----
const ecols = ["kind", "actor_id", "project_id", "task_id", "detail", "elapsed_s", "created_at"];
await insert("events", ecols, [
  ["project_created", george, bundles, null, null, null, at(126)],
  ["project_created", maya, fieldguide, null, null, null, at(122)],
  ["project_created", devon, radio, null, null, null, at(121)],
  ["project_created", priya, grants, null, null, null, at(115)],
  ["project_created", lena, mentor, null, null, null, at(114)],
  ["project_created", sam, logo, null, null, null, at(110)],
  ["project_created", george, boardpack, null, null, null, at(105)],
  ["stage_advanced", priya, grants, null, "commit", null, at(102)],
  ["ball_passed", lena, mentor, null, "Marcus Hale", null, at(98)],
  ["ball_caught", marcus, mentor, null, "Draft the pairing rubric", 4 * 3600, at(94)],
  ["stage_advanced", priya, grants, null, "build", null, at(92)],
  ["task_done", lena, mentor, t10, "Send intake form", null, at(48)],
  ["stage_advanced", george, bundles, null, "build", null, at(74)],
  ["task_done", maya, fieldguide, t4, "Interview three members", null, at(52)],
  ["stage_advanced", devon, radio, null, "verify", null, at(58)],
  ["ball_passed", marcus, mentor, null, "Lena Rossi", null, at(47)],
  ["ball_caught", lena, mentor, null, "Fold interview quotes into the intake sheet", 2 * 3600, at(45)],
  ["task_done", priya, grants, t8, "Publish funder one-pagers", null, at(44)],
  ["stage_advanced", priya, grants, null, "verify", null, at(40)],
  ["whistle_blown", devon, radio, null, "still for 48h", null, at(30)],
  ["task_done", george, bundles, t1, "Photograph current inventory", null, at(28)],
  ["submission_merged", priya, grants, null, null, null, at(28)],
  ["blocker_raised", lena, mentor, t9, "Match round one pairings", null, at(26)],
  ["stage_advanced", priya, grants, null, "ship", null, at(22)],
  ["whistle_blown", george, boardpack, null, "still for 48h", null, at(20)],
  ["submission_merged", sam, logo, null, null, null, at(8)],
  ["submission_merged", maya, fieldguide, null, null, null, at(6)],
  ["submission_merged", george, bundles, null, null, null, at(4)],
  ["ball_passed", maya, fieldguide, null, "George Eastwood", null, at(3)],
]);

// ---- reviews (Marcus reviewed Priya's; unlocks nothing for George — his to do) ----
const [priyaSub] = (await sql.query(`SELECT id FROM submissions WHERE user_id = $1`, [priya])).rows;
await insert("reviews", ["reviewer_id", "submission_id", "issue_url", "is_deep", "filed_at"],
  [[marcus, priyaSub.id, "https://github.com/rogerSuperBuilderAlpha/hult-cohort-program/issues/901", false, at(5)]]);
await insert("events", ecols, [["review_filed", marcus, grants, null, null, null, at(5)]]);

const counts = {};
for (const t of ["users", "projects", "tasks", "submissions", "reviews", "events"]) {
  counts[t] = (await sql.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
}
console.log("seeded:", JSON.stringify(counts));
