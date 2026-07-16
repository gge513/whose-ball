import { and, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { events, projects } from "@/lib/db/schema";
import { fmtElapsed, type EventKind } from "@/lib/events";

/**
 * The weekly narrative writer (ratified 2026-07-16): a composed match
 * report per chapter, two movements — the member's own motion first, the
 * connective tissue second — closed by one cohort clause. Deterministic
 * template composition, no model at runtime: every word this file can
 * ever emit is in this file. The DFW-informed voice is allowed here and
 * on the momentum page only; vocabulary is the earned words (rally,
 * catch, drop, assist, hold) and nothing decorative.
 *
 * Stance: third person for every reader (PROVISIONAL — under review
 * after George's live test). Sentence rules keep the subject swappable:
 * past-tense verbs conjugate identically for "you" and a name, so a
 * second-person page is a Subject swap, not a rewrite.
 */

/* ---------------------------------------------------------------- */
/* Chapters: the season's named weeks, then anonymous weeks forever  */
/* ---------------------------------------------------------------- */

/** Mon Jul 13 2026, 00:00 ET — the pilot's first morning. */
const SEASON_START = new Date("2026-07-13T04:00:00Z");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The season definition: index-aligned labels for the program's real
 * weeks. A week past the end of this list still narrates — it just
 * loses its title until someone feeds the app the next season
 * (post-pilot: a season table an operator edits without a deploy).
 */
const SEASON_LABELS: (string | null)[] = ["Build week", "Review week"];

export type Chapter = {
  index: number;
  label: string | null;
  start: Date;
  end: Date;
  ongoing: boolean;
};

/** Every chapter from a starting moment through now, newest first. */
export function chaptersThrough(from: Date, now: Date): Chapter[] {
  const firstIdx = Math.max(
    0,
    Math.floor((from.getTime() - SEASON_START.getTime()) / WEEK_MS)
  );
  const lastIdx = Math.max(
    firstIdx,
    Math.floor((now.getTime() - SEASON_START.getTime()) / WEEK_MS)
  );
  const out: Chapter[] = [];
  for (let i = lastIdx; i >= firstIdx; i--) {
    const start = new Date(SEASON_START.getTime() + i * WEEK_MS);
    const end = new Date(start.getTime() + WEEK_MS);
    out.push({
      index: i,
      label: SEASON_LABELS[i] ?? null,
      start,
      end,
      ongoing: now >= start && now < end,
    });
  }
  return out;
}

/** A chapter's display title ("Build week" or "the week of Jul 27"). */
export function chapterTitle(c: Chapter): string {
  if (c.label) return c.label;
  return `the week of ${c.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  })}`;
}

/* ---------------------------------------------------------------- */
/* The writer: event rows in, one paragraph out                      */
/* ---------------------------------------------------------------- */

export type NarrativeEvent = {
  kind: EventKind;
  detail: string | null;
  elapsedS: number | null;
  projectName: string | null;
  createdAt: Date;
};

export type CohortWindow = {
  tasksDone: number;
  reviewsFiled: number;
  ballsCaught: number;
};

/**
 * Swappable subject (the provisional-stance escape hatch): past-tense
 * verbs read the same after "you" and after a name, so second person is
 * `{ name: "you", pronoun: "you", possessive: "your" }` and nothing else
 * changes.
 */
export type Subject = {
  name: string;
  pronoun: string; // "they" — never guessed from a name
  possessive: string; // "their"
};

/** Movement one: motion that is the member's alone. */
const OWN_KINDS: ReadonlySet<EventKind> = new Set([
  "project_created",
  "stage_advanced",
  "task_done",
  "submission_merged",
  "review_filed",
  "ball_picked_up",
] as EventKind[]);

/** Movement two: motion with someone else's name in it. */
const CONNECTIVE_KINDS: ReadonlySet<EventKind> = new Set([
  "assist",
  "assist_converted",
  "ball_passed",
  "ball_caught",
  "blocker_raised",
  "blocker_cleared",
] as EventKind[]);

/* whistle_blown and ball_dropped are deliberately absent from both
   movements: they are no-fault facts about a ball, and a personal
   narrative that replayed them would be keeping score of stillness. The
   pickup — the redemption — is what gets witnessed. */

/** Deterministic variety: same member + same chapter = same sentence. */
function pick<T>(variants: T[], seed: number): T {
  return variants[Math.abs(seed) % variants.length];
}

const q = (s: string | null) => `"${s ?? "…"}"`;

/** Movement one, aggregated into ordered clauses. */
function ownClauses(evs: NarrativeEvent[]): string[] {
  const by = (k: EventKind) => evs.filter((e) => e.kind === k);
  const clauses: string[] = [];

  const merged = by("submission_merged");
  if (merged.length > 0) clauses.push("merged the submission PR");

  const done = by("task_done");
  if (done.length === 1) clauses.push(`shipped ${q(done[0].detail)}`);
  else if (done.length > 1)
    clauses.push(
      `shipped ${done.length} tasks, ${q(done[done.length - 1].detail)} the latest`
    );

  const stages = by("stage_advanced");
  if (stages.length === 1)
    clauses.push(
      `moved ${stages[0].projectName ?? "a project"} to ${stages[0].detail}`
    );
  else if (stages.length > 1)
    clauses.push(
      `pushed ${stages.length} stage advances, landing at ${
        stages[stages.length - 1].detail
      }`
    );

  const reviews = by("review_filed");
  if (reviews.length === 1) clauses.push("filed a review");
  else if (reviews.length > 1) clauses.push(`filed ${reviews.length} reviews`);

  const pickups = by("ball_picked_up");
  if (pickups.length > 0) {
    const last = pickups[pickups.length - 1];
    const named = last.detail && !last.detail.startsWith("http");
    clauses.push(
      named
        ? `picked the ball back up on ${last.projectName ?? "a project"}, next move ${q(last.detail)}`
        : `picked the ball back up on ${last.projectName ?? "a project"}`
    );
  }

  const created = by("project_created");
  if (created.length === 1)
    clauses.push(`started ${created[0].projectName ?? "a new project"}`);
  else if (created.length > 1)
    clauses.push(`started ${created.length} projects`);

  return clauses;
}

/** Movement two: the clauses with other people in them. */
function connectiveClauses(evs: NarrativeEvent[]): string[] {
  const by = (k: EventKind) => evs.filter((e) => e.kind === k);
  const clauses: string[] = [];

  // Every clause must read after the subject ("they …") — verb-led only.
  const conversions = by("assist_converted");
  if (conversions.length === 1)
    clauses.push(
      `saw the assist on ${q(conversions[0].detail)} convert when it shipped`
    );
  else if (conversions.length > 1)
    clauses.push(
      `saw ${conversions.length} assists convert into shipped work`
    );

  const assists = by("assist");
  if (assists.length === 1)
    clauses.push(
      `logged an assist, clearing the blocker on ${q(assists[0].detail)}`
    );
  else if (assists.length > 1)
    clauses.push(`logged ${assists.length} assists on teammates' blockers`);

  const catches = by("ball_caught");
  if (catches.length === 1) {
    const c = catches[0];
    clauses.push(
      c.elapsedS
        ? `caught the ball on ${c.projectName ?? "a project"} in ${fmtElapsed(c.elapsedS)}`
        : `caught the ball on ${c.projectName ?? "a project"}`
    );
  } else if (catches.length > 1) {
    const fastest = Math.min(
      ...catches.map((c) => c.elapsedS ?? Infinity)
    );
    clauses.push(
      Number.isFinite(fastest)
        ? `caught ${catches.length} balls, the ${
            catches.length === 2 ? "faster" : "fastest"
          } in ${fmtElapsed(fastest)}`
        : `caught ${catches.length} balls`
    );
  }

  const passes = by("ball_passed");
  if (passes.length === 1)
    clauses.push(`passed the ball to ${passes[0].detail ?? "a teammate"}`);
  else if (passes.length > 1)
    clauses.push(`put ${passes.length} passes in the air`);

  const cleared = by("blocker_cleared");
  if (cleared.length > 0)
    clauses.push(
      cleared.length === 1
        ? `cleared the way on ${q(cleared[0].detail)}`
        : `cleared the way ${cleared.length} times`
    );

  const raised = by("blocker_raised");
  if (raised.length > 0)
    clauses.push(
      raised.length === 1
        ? `asked for help on ${q(raised[0].detail)}, naming exactly what was needed`
        : `asked for help ${raised.length} times, each with a named unblocker`
    );

  return clauses;
}

/** The week's character, judged from the shape of the two piles. */
type WeekShape =
  | "merge"
  | "shipping"
  | "helping"
  | "stuck_unstuck"
  | "reviewing"
  | "quiet_connected"
  | "quiet";

function classify(own: NarrativeEvent[], conn: NarrativeEvent[]): WeekShape {
  if (own.length === 0 && conn.length === 0) return "quiet";
  if (own.some((e) => e.kind === "submission_merged")) return "merge";
  if (own.length === 0) return "quiet_connected";
  const ships = own.filter((e) => e.kind === "task_done").length;
  const reviews = own.filter((e) => e.kind === "review_filed").length;
  const helps = conn.filter(
    (e) => e.kind === "assist" || e.kind === "assist_converted"
  ).length;
  if (
    conn.some((e) => e.kind === "blocker_raised") &&
    ships > 0
  )
    return "stuck_unstuck";
  if (helps > ships && helps > reviews) return "helping";
  if (reviews > ships) return "reviewing";
  return "shipping";
}

/** Opening lines: one judgment sentence per shape, a few variants each. */
function opening(shape: WeekShape, s: Subject, seed: number): string {
  const lines: Record<WeekShape, string[]> = {
    merge: [
      `A week that ended where the program points: ${s.name} merged the submission PR.`,
      `The week the work left the building — ${s.name}'s submission PR went in and got merged.`,
    ],
    shipping: [
      `A shipping week for ${s.name}.`,
      `${s.name} kept the ball moving all week.`,
      `Head down, ball in hand: ${s.name}'s week was mostly motion.`,
    ],
    helping: [
      `${s.name} spent the week in other people's projects, which is its own kind of week to watch.`,
      `The quiet work was the story of ${s.name}'s week: other people's blockers, cleared.`,
    ],
    stuck_unstuck: [
      `${s.name} hit a wall this week, named it out loud, and shipped anyway.`,
      `A stuck-then-unstuck week: ${s.name} asked for help the structured way, and the work moved again.`,
    ],
    reviewing: [
      `${s.name} spent the week reading the cohort's work — the part of the game played sitting down.`,
      `A reviewing week for ${s.name}.`,
    ],
    quiet_connected: [
      `${s.possessive[0].toUpperCase()}${s.possessive.slice(1)} own board sat quiet this week; ${s.possessive} fingerprints didn't.`,
      `${s.name} logged nothing new this week — but earlier work kept landing.`,
    ],
    quiet: [`A quiet week — nothing recorded.`],
  };
  return pick(lines[shape], seed);
}

/** Join clauses into one readable sentence: a, b, and c. */
function joinClauses(subjectWord: string, clauses: string[]): string {
  const top = clauses.slice(0, 4);
  const body =
    top.length === 1
      ? top[0]
      : top.length === 2
        ? `${top[0]}, and ${top[1]}`
        : `${top.slice(0, -1).join(", ")}, and ${top[top.length - 1]}`;
  return `${subjectWord} ${body}.`;
}

/** The cohort close: one clause situating the week inside the season. */
function cohortClose(c: CohortWindow, seed: number): string | null {
  const parts: string[] = [];
  if (c.tasksDone > 0)
    parts.push(`shipped ${c.tasksDone} task${c.tasksDone === 1 ? "" : "s"}`);
  if (c.ballsCaught > 0)
    parts.push(
      `caught ${c.ballsCaught} ball${c.ballsCaught === 1 ? "" : "s"}`
    );
  if (c.reviewsFiled > 0)
    parts.push(
      `filed ${c.reviewsFiled} review${c.reviewsFiled === 1 ? "" : "s"}`
    );
  if (parts.length === 0) return null;
  const openers = [
    "All of it inside a week the cohort",
    "Around it, a cohort that",
  ];
  return `${pick(openers, seed)} ${
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
  }.`;
}

/**
 * The paragraph. Renders whichever movements have material (the ratified
 * quiet-week fold-in): no own motion still narrates the connective tissue,
 * nothing at all gets the one honest, no-fault line — never silence,
 * never scolding.
 */
export function writeChapter(input: {
  subject: Subject;
  events: NarrativeEvent[];
  cohort: CohortWindow;
  seed: number;
}): string {
  const own = input.events.filter((e) => OWN_KINDS.has(e.kind));
  const conn = input.events.filter((e) => CONNECTIVE_KINDS.has(e.kind));
  const shape = classify(own, conn);
  const s = input.subject;

  const sentences: string[] = [opening(shape, s, input.seed)];

  if (shape === "quiet") return sentences[0];

  const m1 = ownClauses(own);
  const m2 = connectiveClauses(conn);

  // The opening for a merge week already spends the merge — don't say it twice.
  const m1Rest = shape === "merge" ? m1.filter((c) => c !== "merged the submission PR") : m1;

  if (m1Rest.length > 0) {
    // First movement rides on the pronoun; the name was spent in the opening.
    sentences.push(joinClauses(cap(s.pronoun), m1Rest));
  }
  if (m2.length > 0) {
    const connectors = [
      "The connective tissue:",
      "And the part with other people's names in it:",
    ];
    sentences.push(
      `${pick(connectors, input.seed + 1)} ${lower(joinClauses(s.pronoun, m2))}`
    );
  }

  const close = cohortClose(input.cohort, input.seed + 2);
  if (close) sentences.push(close);

  return sentences.join(" ");
}

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
const lower = (sentence: string) =>
  sentence[0].toLowerCase() + sentence.slice(1);

/* ---------------------------------------------------------------- */
/* Loader: the member page's one call                                */
/* ---------------------------------------------------------------- */

export type ChapterReport = {
  chapter: Chapter;
  paragraph: string;
};

/**
 * All of a member's chapter reports, newest first, starting at the
 * chapter that saw them arrive (weeks before a member existed aren't
 * quiet weeks — they aren't weeks at all).
 */
export async function loadNarrative(member: {
  id: number;
  name: string;
  createdAt: Date;
}): Promise<ChapterReport[]> {
  const now = new Date();
  const chapters = chaptersThrough(member.createdAt, now);
  const subject: Subject = {
    name: member.name,
    pronoun: "they",
    possessive: "their",
  };

  const reports: ChapterReport[] = [];
  for (const chapter of chapters) {
    const rows = await db
      .select({
        kind: events.kind,
        detail: events.detail,
        elapsedS: events.elapsedS,
        projectName: projects.name,
        createdAt: events.createdAt,
      })
      .from(events)
      .leftJoin(projects, eq(events.projectId, projects.id))
      .where(
        and(
          eq(events.actorId, member.id),
          gte(events.createdAt, chapter.start),
          lt(events.createdAt, chapter.end)
        )
      )
      .orderBy(events.createdAt, events.id);

    const [cohort] = await db
      .select({
        tasksDone: sql<number>`count(*) filter (where ${events.kind} = 'task_done')::int`,
        reviewsFiled: sql<number>`count(*) filter (where ${events.kind} = 'review_filed')::int`,
        ballsCaught: sql<number>`count(*) filter (where ${events.kind} = 'ball_caught')::int`,
      })
      .from(events)
      .where(
        and(gte(events.createdAt, chapter.start), lt(events.createdAt, chapter.end))
      );

    reports.push({
      chapter,
      paragraph: writeChapter({
        subject,
        events: rows,
        cohort,
        seed: member.id * 31 + chapter.index,
      }),
    });
  }
  return reports;
}
