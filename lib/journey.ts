import { REVIEW_WEEK } from "@/lib/review-week";

/**
 * The week-1 journey, live-reconciled: Build (submission PR merged by
 * Sun 17:00 ET) → Review & vote (one window, closes Mon 14:00 ET) →
 * Operate. The retired repo-doc model's Wed/Fri checkpoints and separate
 * vote day do not exist in the live rules.
 */
export type PhaseKey = "build" | "review" | "operate";

export type JourneyPhase = {
  key: PhaseKey;
  label: string;
  /** What this phase demands, one breath. */
  demand: string;
  /** What the deadline means ("{verb} {date}"). */
  deadlineVerb: string;
  deadline: Date | null;
};

export const JOURNEY: JourneyPhase[] = [
  {
    key: "build",
    label: "Build",
    demand: "ship it — submission PR merged into the program repo",
    deadlineVerb: "merged by",
    deadline: REVIEW_WEEK.submissionMergeDeadline,
  },
  {
    key: "review",
    label: "Review & vote",
    demand: "a written review and a private ballot for every merged peer",
    deadlineVerb: "in by",
    deadline: REVIEW_WEEK.reviewsAndVotesClose,
  },
  {
    key: "operate",
    label: "Operate",
    demand: "the winner runs it; everyone else keeps contributing",
    deadlineVerb: "",
    deadline: null,
  },
];

/** Where the cohort is right now, purely off the clock. */
export function currentPhase(now: Date = new Date()): JourneyPhase {
  return (
    JOURNEY.find((p) => p.deadline !== null && now < p.deadline) ??
    JOURNEY[JOURNEY.length - 1]
  );
}

/**
 * The request clock, for seeding the client countdown. Server components
 * render per-request, so "now" here is honest — this lives outside the
 * component so the render-purity lint doesn't mistake it for instability.
 */
export function requestNowMs(): number {
  return Date.now();
}

/** Deadline text, always in the program's timezone. */
export function fmtET(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}
