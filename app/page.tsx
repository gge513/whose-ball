import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * The front door (ratified decision 4): members land on their own command
 * center, not a feed. Strangers get the one-breath pitch and the two doors.
 * v1's public heartbeat grid lived here; it retired when the momentum page
 * (movement without ranking) replaced its job.
 */
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/me");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="ball-dot" />
      <h1 className="mt-4 font-display text-4xl font-extrabold uppercase tracking-[0.12em] text-ink">
        Whose Ball
      </h1>
      <p className="mt-3 max-w-md font-mono text-sm text-muted">
        The cohort task board that always knows your next move. One ball per
        project, one holder, one click back into the work.
      </p>
      {/* The model in one breath (logged 2026-07-19: the three layers must
          self-explain) — reviewers arrive cold; this is the whole game. */}
      <p className="mt-4 max-w-md font-mono text-[11px] leading-relaxed text-faint">
        three layers: the stages tell the story · the ball names the one next
        move and whose it is · the tasks are the work. the ball is a pointer,
        not a task — the feed witnesses what ships.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/signin"
          className="rounded bg-ball px-5 py-2.5 font-mono text-sm font-bold text-court hover:bg-ball-deep"
        >
          sign in
        </Link>
        <Link
          href="/signup"
          className="rounded border border-line px-5 py-2.5 font-mono text-sm text-ink hover:border-ball"
        >
          create account
        </Link>
      </div>
    </div>
  );
}
