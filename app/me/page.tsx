import Link from "next/link";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AuthButtons } from "@/app/components/auth-buttons";
import { MemberLink } from "@/app/components/member-link";
import { SiteHeader } from "@/app/components/site-header";
import {
  catchBallAction,
  pickWhistleCauseAction,
  pickupDefineAction,
  pickupEvidenceAction,
} from "@/app/projects/actions";
import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { projects, tasks, users } from "@/lib/db/schema";
import { fmtElapsed } from "@/lib/events";
import { requestNowMs } from "@/lib/journey";
import { sweepDrops } from "@/lib/rally";
import { STAGE_ORDER } from "@/lib/stages";
import {
  WHISTLE_CAUSES,
  WHISTLE_STILL_HOURS,
  sweepWhistles,
  type WhistleCause,
} from "@/lib/whistle";

export const dynamic = "force-dynamic";

/** How long someone has been waiting, in the coarsest honest unit. */
function waitedFor(since: Date): string {
  const h = Math.max(1, Math.floor((Date.now() - since.getTime()) / 3600000));
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * The command center — the front door. Answers, in order:
 * what's my next move (the balls), what you're holding that others wait
 * on, what's mine in flight, with the cohort's pulse one glance away.
 */
export default async function MePage() {
  const userId = await currentDbUserId();

  if (!userId) {
    return (
      <div className="min-h-screen">
        <SiteHeader active="me" auth={<AuthButtons />} />
        <main className="mx-auto max-w-sm px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted">
            Your command center needs to know who you are.
          </p>
          <Link
            href="/signin"
            className="mt-4 inline-block rounded bg-ink px-4 py-2 font-mono text-sm font-bold text-court hover:bg-white"
          >
            sign in
          </Link>
        </main>
      </div>
    );
  }

  await sweepDrops(); // overdue passes become drops before we render
  await sweepWhistles(); // then still balls get whistled (drops reset the clock)

  const [me] = await db.select().from(users).where(eq(users.id, userId));

  const passer = alias(users, "passer");
  const myBalls = await db
    .select({
      id: projects.id,
      name: projects.name,
      stage: projects.stage,
      nextAction: projects.nextAction,
      nextActionCommittedFor: projects.nextActionCommittedFor,
      ballPassedAt: projects.ballPassedAt,
      whistleBlownAt: projects.whistleBlownAt,
      whistleCause: projects.whistleCause,
      passerId: projects.ballPasserId,
      passerName: passer.name,
    })
    .from(projects)
    .leftJoin(passer, eq(projects.ballPasserId, passer.id))
    .where(
      and(eq(projects.ballHolderId, userId), isNull(projects.archivedAt))
    )
    .orderBy(asc(projects.updatedAt));

  // The possession view (ratified): every ball you hold that someone else
  // is waiting on — blockers naming you, plus project balls you hold on
  // someone else's project. Ranked by wait time, capped at three, private
  // to this page, never scored.
  const waiter = alias(users, "waiter");
  const blockedOnMe = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      projectName: projects.name,
      whatNeeded: tasks.blockedWhatNeeded,
      since: tasks.blockedAt,
      waiterId: waiter.id,
      waiterName: waiter.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(waiter, eq(tasks.assigneeId, waiter.id))
    .where(
      and(
        eq(tasks.status, "blocked"),
        eq(tasks.blockedUnblockerId, userId),
        isNull(tasks.archivedAt)
      )
    );
  const owner = alias(users, "owner");
  const heldBalls = await db
    .select({
      id: projects.id,
      name: projects.name,
      nextAction: projects.nextAction,
      since: projects.updatedAt,
      waiterId: owner.id,
      waiterName: owner.name,
    })
    .from(projects)
    .leftJoin(owner, eq(projects.ownerId, owner.id))
    .where(
      and(
        eq(projects.ballHolderId, userId),
        ne(projects.ownerId, userId),
        isNull(projects.archivedAt),
        // A pass still in the air isn't held yet — it renders as a catch
        // card under "your balls", not as possession.
        isNull(projects.ballPassedAt)
      )
    );

  // Card rule (tune-list #1/#3): the project name leads, the mechanic is
  // the badge — a card you can't place in a project is a card you skip.
  const holding = [
    ...blockedOnMe.map((t) => ({
      key: `task-${t.id}`,
      href: `/projects/${t.projectId}`,
      projectName: t.projectName ?? "a project",
      badge: "blocker names you",
      detail: `${t.title} · needs: ${t.whatNeeded}`,
      waiterId: t.waiterId,
      waiterName: t.waiterName,
      since: t.since,
    })),
    ...heldBalls.map((p) => ({
      key: `ball-${p.id}`,
      href: `/projects/${p.id}`,
      projectName: p.name,
      badge: "you hold the ball",
      detail: p.nextAction ?? "the next move needs a name",
      waiterId: p.waiterId,
      waiterName: p.waiterName,
      since: p.since,
    })),
  ].sort(
    (a, b) => (a.since?.getTime() ?? Infinity) - (b.since?.getTime() ?? Infinity)
  );
  const holdingTop = holding.slice(0, 3);

  const myOpenTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      projectId: tasks.projectId,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        ne(tasks.status, "done"),
        isNull(tasks.archivedAt)
      )
    )
    .orderBy(asc(tasks.createdAt));

  // Cohort pulse: collective numbers, no names, no ranking.
  const liveTasks = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(isNull(tasks.archivedAt));
  const liveProjects = await db
    .select({ stage: projects.stage })
    .from(projects)
    .where(isNull(projects.archivedAt));
  const pulse = {
    projects: liveProjects.length,
    shipped: liveProjects.filter(
      (p) => STAGE_ORDER.indexOf(p.stage) >= STAGE_ORDER.indexOf("ship")
    ).length,
    tasksDone: liveTasks.filter((t) => t.status === "done").length,
    helpWanted: liveTasks.filter((t) => t.status === "blocked").length,
  };

  return (
    <div className="min-h-screen">
      <SiteHeader active="me" auth={<AuthButtons />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Cohort pulse strip: the team, one glance, zero rank —
            clicks through to the full momentum page (ratified decision 4) */}
        <Link
          href="/momentum"
          className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded border border-line-soft bg-panel px-4 py-2.5 font-mono text-[11px] text-muted transition-colors hover:border-line"
        >
          <span className="uppercase tracking-wide text-faint">cohort pulse</span>
          <span>{pulse.projects} projects live</span>
          <span>{pulse.shipped} shipped</span>
          <span>{pulse.tasksDone} tasks done</span>
          <span className={pulse.helpWanted > 0 ? "text-amber" : ""}>
            {pulse.helpWanted} asking for help
          </span>
        </Link>

        <h1 className="mt-8 flex flex-wrap items-baseline gap-x-4 font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
          <Link href={`/members/${userId}`} className="hover:underline">
            {me?.name ?? "you"}
          </Link>
          <Link
            href={`/members/${userId}`}
            className="font-mono text-xs font-normal normal-case tracking-normal text-muted hover:text-ink"
          >
            your season →
          </Link>
        </h1>

        {/* The balls: next actions with handles */}
        <section className="mt-6">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            your balls · {myBalls.length}
          </h2>
          {myBalls.length === 0 ? (
            <p className="mt-2 font-mono text-sm text-faint">
              Nothing in your court.{" "}
              <Link href="/projects" className="text-ink underline">
                Browse projects →
              </Link>
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myBalls.map((p) =>
                p.ballPassedAt ? (
                  /* A pass in the air for you: not yours until you catch it
                     by naming your first action (the rally, ratified) */
                  <li
                    key={p.id}
                    className="rounded border border-ball/40 bg-panel p-4"
                  >
                    <p className="flex items-center gap-3">
                      <span className="ball-dot shrink-0" />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-display text-base font-bold text-ink hover:underline"
                          >
                            {p.name}
                          </Link>
                          <span className="rounded border border-ball/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ball">
                            pass · in the air{" "}
                            {fmtElapsed(
                              (requestNowMs() - p.ballPassedAt.getTime()) /
                                1000
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted">
                          <MemberLink id={p.passerId} name={p.passerName} />{" "}
                          passed you the ball
                          {p.nextAction && ` · the ask: ${p.nextAction}`}
                        </span>
                      </span>
                    </p>
                    <form
                      action={catchBallAction.bind(null, p.id)}
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      <input
                        name="firstAction"
                        required
                        placeholder="name your first action to catch it"
                        className="min-w-64 flex-1 rounded border border-ball/40 bg-panel-2 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint focus:border-ball focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded bg-ball px-3 py-2 font-mono text-xs font-bold text-court hover:bg-ball-deep"
                      >
                        catch
                      </button>
                    </form>
                  </li>
                ) : p.whistleBlownAt ? (
                  /* The pickup card (the dead-ball whistle, ratified):
                     public whistle, private cause. One tap names why the
                     ball is still; the remedy matches the cause. Inline
                     remedies clear it right here, like the catch;
                     multi-field remedies route to the real form and the
                     whistle stands until the artifact exists. */
                  <li
                    key={p.id}
                    className="rounded border border-amber/40 bg-panel p-4"
                  >
                    <p className="flex items-center gap-3">
                      <span className="ball-dot shrink-0 opacity-50" />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-display text-base font-bold text-ink hover:underline"
                          >
                            {p.name}
                          </Link>
                          <span className="rounded border border-amber/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber">
                            whistled · still for{" "}
                            {/* stillness started a full whistle-window
                                before the whistle itself blew */}
                            {fmtElapsed(
                              (requestNowMs() - p.whistleBlownAt.getTime()) /
                                1000 +
                                WHISTLE_STILL_HOURS * 3600
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted">
                          {p.nextAction
                            ? `the ball: ${p.nextAction}`
                            : "the ball never got a name"}
                        </span>
                      </span>
                    </p>

                    {!p.whistleCause ? (
                      <div className="mt-3">
                        <p className="font-mono text-[11px] text-muted">
                          why is it still?
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(
                            Object.keys(WHISTLE_CAUSES) as WhistleCause[]
                          ).map((c) => (
                            <form
                              key={c}
                              action={pickWhistleCauseAction.bind(null, p.id)}
                            >
                              <input type="hidden" name="cause" value={c} />
                              <button
                                type="submit"
                                className="rounded border border-amber/40 px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-amber hover:text-amber"
                              >
                                {WHISTLE_CAUSES[c].label}
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        {WHISTLE_CAUSES[p.whistleCause].mode ===
                        "inline_define" ? (
                          <form
                            action={pickupDefineAction.bind(null, p.id)}
                            className="flex flex-wrap gap-2"
                          >
                            <input
                              name="nextAction"
                              required
                              placeholder="name the next action to pick it up"
                              className="min-w-64 flex-1 rounded border border-amber/40 bg-panel-2 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint focus:border-amber focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="rounded bg-ball px-3 py-2 font-mono text-xs font-bold text-court hover:bg-ball-deep"
                            >
                              define it
                            </button>
                          </form>
                        ) : WHISTLE_CAUSES[p.whistleCause].mode ===
                          "inline_evidence" ? (
                          <form
                            action={pickupEvidenceAction.bind(null, p.id)}
                            className="flex flex-wrap gap-2"
                          >
                            <input
                              name="evidenceUrl"
                              type="url"
                              required
                              placeholder="link the evidence — a PR, an issue, a doc"
                              className="min-w-64 flex-1 rounded border border-amber/40 bg-panel-2 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint focus:border-amber focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="rounded bg-ball px-3 py-2 font-mono text-xs font-bold text-court hover:bg-ball-deep"
                            >
                              link it
                            </button>
                          </form>
                        ) : (
                          <p className="font-mono text-xs text-muted">
                            <Link
                              href={`/projects/${p.id}${
                                WHISTLE_CAUSES[p.whistleCause].anchor ?? ""
                              }`}
                              className="text-amber hover:underline"
                            >
                              {WHISTLE_CAUSES[p.whistleCause].remedy} →
                            </Link>{" "}
                            <span className="text-faint">
                              the whistle clears when it exists
                            </span>
                          </p>
                        )}
                        <form
                          action={pickWhistleCauseAction.bind(null, p.id)}
                          className="mt-2"
                        >
                          <input type="hidden" name="cause" value="" />
                          <button
                            type="submit"
                            className="font-mono text-[10px] text-faint hover:text-muted"
                          >
                            ← different cause
                          </button>
                        </form>
                      </div>
                    )}
                  </li>
                ) : (
                  <li key={p.id}>
                    {/* The ball is a button: the next step, and a door into it */}
                    <Link
                      href={`/projects/${p.id}`}
                      className="group flex items-center gap-3 rounded border border-ball/40 bg-panel p-4 transition-all hover:border-ball hover:shadow-[0_0_16px_rgba(200,245,34,0.15)]"
                    >
                      <span className="ball-dot shrink-0" />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-display text-base font-bold text-ink">
                            {p.name}
                          </span>
                          <span className="rounded border border-ball/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ball">
                            your ball · {p.stage}
                          </span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted">
                          {p.nextAction ?? "set the next move"}
                          {p.nextActionCommittedFor &&
                            p.nextActionCommittedFor > new Date() &&
                            ` · committed for ${p.nextActionCommittedFor.toLocaleDateString()}`}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-faint transition-colors group-hover:text-ball">
                        go →
                      </span>
                    </Link>
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        {/* The possession view: what you hold that others are waiting on.
            Always rendered — the empty state does the motivational work. */}
        <section className="mt-8">
          <h2
            className={`font-mono text-[11px] uppercase tracking-wide ${
              holding.length > 0 ? "text-amber" : "text-muted"
            }`}
          >
            holding · {holding.length} waiting on you
          </h2>
          {holding.length === 0 ? (
            <p className="mt-2 font-mono text-sm text-faint">
              Nothing waiting on you. Clean hands.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {holdingTop.map((h) => (
                  /* A div, not a wrapping link (anchors don't nest): the
                     project name is the door, the waiter is a person. */
                  <li
                    key={h.key}
                    className="flex items-baseline gap-3 rounded border border-amber/40 bg-panel p-3 transition-colors hover:border-amber"
                  >
                    <span className="flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <Link
                          href={h.href}
                          className="font-display text-sm font-bold text-ink hover:underline"
                        >
                          {h.projectName}
                        </Link>
                        <span className="rounded border border-amber/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber">
                          {h.badge}
                        </span>
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted">
                        {h.detail}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-amber">
                      <MemberLink
                        id={h.waiterId}
                        name={h.waiterName}
                        className="text-amber"
                      />{" "}
                      waiting
                      {h.since && ` · ${waitedFor(h.since)}`}
                    </span>
                  </li>
                ))}
              </ul>
              {holding.length > holdingTop.length && (
                <p className="mt-2 font-mono text-[11px] text-faint">
                  + {holding.length - holdingTop.length} more, longest waits
                  first
                </p>
              )}
            </>
          )}
        </section>

        {/* My open tasks */}
        <section className="mt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            your open tasks · {myOpenTasks.length}
          </h2>
          {myOpenTasks.length === 0 ? (
            <p className="mt-2 font-mono text-sm text-faint">All clear.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line-soft rounded border border-line bg-panel">
              {myOpenTasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/projects/${t.projectId}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-panel-2"
                  >
                    <span className="font-mono text-sm text-ink">{t.title}</span>
                    <span className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-muted">{t.projectName}</span>
                      <span
                        className={
                          t.status === "blocked" ? "text-amber" : "text-ink"
                        }
                      >
                        {t.status}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
