import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";

// The six-stage trajectory lives on PROJECTS (ratified: pipeline at project
// altitude). The database itself rejects any stage not in this list — a typo
// is a loud error at write time, never a silent phantom state.
export const projectStage = pgEnum("project_stage", [
  "define",
  "commit",
  "build",
  "verify",
  "ship",
  "teach",
]);

// Tasks ride the light flow. "blocked" is a real state (ratified: light
// blocker model), entered only with its three fields filled in — that rule
// is enforced in the server action, not here.
// The dead-ball whistle's cause (ratified: cause-typed pickup). Picked by
// the holder with one tap, private to them — never rendered in the feed.
// Each cause routes to its own remedy; the routing lives in lib/whistle.ts.
export const whistleCause = pgEnum("whistle_cause", [
  "unclear", // next action unclear → define it (inline)
  "too_big", // too big → split it (new-task form)
  "missing_skill", // missing skill → ask for help (blocker form)
  "waiting", // waiting on someone → name the unblocker (blocker form)
  "moving", // actually moving → link the evidence (inline)
]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "building",
  "verifying",
  "done",
  "blocked",
]);

// The workspace: the container a team lives in (v3 lock 1). The cohort is
// workspace #1; the next one is a real team. No roles yet — everyone in a
// workspace is a member, consistent with the app's flat-authz stance.
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // The vision (v3 lock 4): the one shared why the workspace's projects
  // ladder into. Rendered on /me and momentum; goals live on projects.
  vision: text("vision"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.userId)]
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  githubLogin: text("github_login").unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  // Null for GitHub-OAuth users; set for email+password accounts
  // (the staff test account signs in this way).
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  workspaceId: integer("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  ownerId: integer("owner_id")
    .references(() => users.id)
    .notNull(),
  stage: projectStage("stage").default("define").notNull(),

  // The Define gate: these three answer who benefits, what changes, and
  // what done looks like. All null is fine — the project just can't
  // advance past "define" until they're filled (gates the story, never
  // the work).
  whoBenefits: text("who_benefits"),
  whatChanges: text("what_changes"),
  doneLooksLike: text("done_looks_like"),

  // The ball: one named next action, one holder. Rendered as the
  // click-to-action button on the command center.
  nextAction: text("next_action"),
  ballHolderId: integer("ball_holder_id").references(() => users.id),
  // Optional when-commitment; expires quietly, never glares.
  nextActionCommittedFor: timestamp("next_action_committed_for"),

  // The rally (ratified, signature mechanic): a pass puts the ball in the
  // air — ballPassedAt set means uncaught. It becomes the receiver's only
  // when they catch it by naming their first action; uncaught for 24h is
  // a visible, no-fault drop on the project. rallyCount = consecutive
  // clean catches, reset by a drop. Never surfaced per person.
  ballPassedAt: timestamp("ball_passed_at"),
  ballPasserId: integer("ball_passer_id").references(() => users.id),
  rallyCount: integer("rally_count").default(0).notNull(),

  // The dead-ball whistle (ratified, second harvest): a held ball with no
  // recorded motion for 48h gets whistled. blownAt set = whistle live;
  // cause is the holder's private one-tap answer, null until they pick.
  // Cleared only by the routed remedy actually existing.
  whistleBlownAt: timestamp("whistle_blown_at"),
  whistleCause: whistleCause("whistle_cause"),

  // Archive, never destroy: null = live, set = archived.
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// One contest submission per member. Eligibility = mergedAt set (the
// rulebook: only merged submission PRs appear on the review/vote list).
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  repoUrl: text("repo_url").notNull(),
  liveUrl: text("live_url"),
  mergedAt: timestamp("merged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A filed written review: the GitHub `Review by @` issue URL, saved here.
// Saving it is what unlocks the vote for that peer. One review per
// reviewer per submission, by construction.
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    reviewerId: integer("reviewer_id")
      .references(() => users.id)
      .notNull(),
    submissionId: integer("submission_id")
      .references(() => submissions.id)
      .notNull(),
    issueUrl: text("issue_url").notNull(),
    isDeep: boolean("is_deep").default(false).notNull(),
    filedAt: timestamp("filed_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.reviewerId, t.submissionId)]
);

// The private ballot: one thumbs per voter per submission, by
// construction. No query in the UI ever aggregates this table; tallies
// exist only for the staff export.
export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    voterId: integer("voter_id")
      .references(() => users.id)
      .notNull(),
    submissionId: integer("submission_id")
      .references(() => submissions.id)
      .notNull(),
    thumbsUp: boolean("thumbs_up").notNull(),
    castAt: timestamp("cast_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.voterId, t.submissionId)]
);

// The moments that matter, as a fixed list: anything else is not a feed
// event. Votes are deliberately absent — the ballot is private and no
// event may ever leak that it happened.
// "assist" logs to the named unblocker when a blocker clears; it
// "assist_converted"s when the unblocked task ships. The save is the
// scored act — prevention made visible.
export const eventKind = pgEnum("event_kind", [
  "project_created",
  "stage_advanced",
  "task_done",
  "blocker_raised",
  "blocker_cleared",
  "review_filed",
  "submission_merged",
  "assist",
  "assist_converted",
  "ball_passed",
  "ball_caught",
  "ball_dropped",
  // The whistle is public and actorless (locked: movement is public,
  // diagnosis is not); the pickup names the holder getting it moving
  // again. The cause NEVER rides on either event.
  "whistle_blown",
  "ball_picked_up",
  // The quiet record (ruled 2026-07-19): overwriting your own ball's
  // action is the ball moving forward — the made move gets witnessed
  // instead of evaporating. Detail carries the OLD action (the one made).
  "ball_advanced",
  // A goal graded met is exactly the kind of moment the feed exists to
  // witness. Dropping one is recorded on the project, not paraded here.
  "goal_met",
]);

// Append-only shipping log. State tables answer "where are things now";
// this table answers "what happened, when" — the momentum feed and the
// weekly narrative both read from it. Rows are never updated or deleted.
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  kind: eventKind("kind").notNull(),
  actorId: integer("actor_id")
    .references(() => users.id)
    .notNull(),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => tasks.id),
  // Snapshot text for the feed line (a stage name, a task title): the feed
  // stays readable even after the object is archived or renamed.
  detail: text("detail"),
  // Catch latency in seconds, carried by ball_caught (ratified: witness,
  // not points — the feed states it, the momentum median tile reads it).
  elapsedS: integer("elapsed_s"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Project goals (v3 lock 3, Foundation-canon DNA): a goal is an OUTCOME a
// stranger could grade — statement + key result (the measure) + owner +
// timeline. Tasks are the work; goals are what the work is for. "dropped"
// records a decided-not-to-do with the same dignity as active goals (the
// canon's "Decided: closed" rows) — a ruled-out goal is never deleted.
export const goalStatus = pgEnum("goal_status", ["open", "met", "dropped"]);

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  statement: text("statement").notNull(),
  // "If a goal can't be graded by a stranger at year-end, it's not a goal
  // yet" — the measure is required, not optional.
  keyResult: text("key_result").notNull(),
  ownerId: integer("owner_id").references(() => users.id),
  // Prose, like the canon's own tables: "Q1–Q2", "Full year", "by Sep 30".
  timeline: text("timeline"),
  status: goalStatus("status").default("open").notNull(),
  // Why it was dropped, or how it was met — the honest one-liner.
  statusNote: text("status_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").default("todo").notNull(),
  // Foreign key, not a text handle: assigning to a ghost is a loud
  // error, and a rename follows everywhere for free.
  assigneeId: integer("assignee_id").references(() => users.id),
  definitionOfDone: text("definition_of_done"),

  // The three blocker fields — required (by the server action) whenever
  // status enters "blocked", so asking for help is structured, visible work.
  blockedWhatTried: text("blocked_what_tried"),
  blockedWhatNeeded: text("blocked_what_needed"),
  blockedUnblockerId: integer("blocked_unblocker_id").references(
    () => users.id
  ),
  blockedAt: timestamp("blocked_at"),

  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
