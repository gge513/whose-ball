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
export const taskStatus = pgEnum("task_status", [
  "todo",
  "building",
  "verifying",
  "done",
  "blocked",
]);

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
