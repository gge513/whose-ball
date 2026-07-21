import Link from "next/link";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";

import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { reviews, submissions, votes } from "@/lib/db/schema";
import {
  currentPhase,
  fmtET,
  JOURNEY,
  requestNowMs,
  type PhaseKey,
} from "@/lib/journey";

import { Countdown } from "./countdown";

type Standing = {
  text: string;
  href: string;
  tone: "posted" | "amber" | "muted";
};

// Literal classes, because Tailwind only compiles what it can see.
const TONE: Record<Standing["tone"], string> = {
  posted: "text-posted",
  amber: "text-amber",
  muted: "text-muted",
};

/**
 * Your standing against the live phase's deadline — the one number that
 * matters right now, not a dashboard.
 */
async function loadStanding(
  userId: number,
  phaseKey: PhaseKey
): Promise<Standing | null> {
  if (phaseKey === "build") {
    const mine = await db.query.submissions.findFirst({
      where: eq(submissions.userId, userId),
    });
    if (mine?.mergedAt)
      return { text: "your submission: merged ✓", href: "/review", tone: "posted" };
    if (mine)
      return {
        text: "your submission: saved, not merged",
        href: "/review",
        tone: "amber",
      };
    return { text: "your submission: not in yet", href: "/review", tone: "muted" };
  }

  if (phaseKey === "review") {
    // One pass over the eligible ballot: every merged peer, with my review
    // and my vote left-joined on.
    const [row] = await db
      .select({
        eligible: sql<number>`count(*)::int`,
        reviewed: sql<number>`count(${reviews.id})::int`,
        voted: sql<number>`count(${votes.id})::int`,
      })
      .from(submissions)
      .leftJoin(
        reviews,
        and(
          eq(reviews.submissionId, submissions.id),
          eq(reviews.reviewerId, userId)
        )
      )
      .leftJoin(
        votes,
        and(eq(votes.submissionId, submissions.id), eq(votes.voterId, userId))
      )
      .where(and(isNotNull(submissions.mergedAt), ne(submissions.userId, userId)));

    const complete =
      row.eligible > 0 && row.reviewed >= row.eligible && row.voted >= row.eligible;
    return {
      text: `reviews ${row.reviewed}/${row.eligible} · votes ${row.voted}/${row.eligible}`,
      href: "/review",
      tone: complete ? "posted" : "muted",
    };
  }

  return null;
}

/**
 * The journey strip (ratified: current phase + live countdown + YOUR
 * standing, on every page). Rides under the scoreboard bar; the full
 * spine lives only on the momentum page.
 */
export async function JourneyHeader() {
  const phase = currentPhase();
  const userId = await currentDbUserId();
  const standing = userId ? await loadStanding(userId, phase.key) : null;

  return (
    <div className="border-t border-line-soft">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-6 py-1.5 font-mono text-[11px]">
        <Link
          href="/momentum"
          className="flex items-center gap-1.5 text-ink hover:underline"
          title="the week's journey — full spine on the momentum page"
        >
          <span className="text-ink">●</span>
          <span className="uppercase tracking-[0.14em]">{phase.label}</span>
        </Link>
        {phase.deadline && (
          <>
            <span className="text-faint">
              {phase.deadlineVerb} {fmtET(phase.deadline)} ET
            </span>
            <Countdown
              deadline={phase.deadline.getTime()}
              serverNow={requestNowMs()}
            />
          </>
        )}
        {standing && (
          <Link
            href={standing.href}
            className={`ml-auto transition-colors hover:underline ${TONE[standing.tone]}`}
          >
            {standing.text}
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * The full journey spine: all three phases, where the cohort stands.
 * Momentum page only.
 */
export function JourneySpine({ now = new Date() }: { now?: Date }) {
  const activeIdx = JOURNEY.findIndex((p) => p.key === currentPhase(now).key);

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {JOURNEY.map((p, i) => {
        const state = i < activeIdx ? "done" : i === activeIdx ? "live" : "ahead";
        return (
          <li
            key={p.key}
            className={`rounded border p-4 ${
              state === "live"
                ? "border-line bg-panel"
                : "border-line-soft bg-panel"
            } ${state === "ahead" ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-2">
              {state === "live" ? (
                <span className="ball-dot" />
              ) : (
                <span
                  className={`font-mono text-xs ${
                    state === "done" ? "text-posted" : "text-faint"
                  }`}
                >
                  {state === "done" ? "✓" : "○"}
                </span>
              )}
              <span className="font-display text-sm font-bold uppercase tracking-[0.08em] text-ink">
                {p.label}
              </span>
            </div>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
              {p.demand}
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-faint">
              {p.deadline
                ? `${p.deadlineVerb} ${fmtET(p.deadline)} ET`
                : "after the vote"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
