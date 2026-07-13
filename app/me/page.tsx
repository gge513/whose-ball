import Link from "next/link";
import { and, asc, eq, isNull, ne } from "drizzle-orm";

import { AuthButtons } from "@/app/components/auth-buttons";
import { SiteHeader } from "@/app/components/site-header";
import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { projects, tasks, users } from "@/lib/db/schema";
import { STAGE_ORDER } from "@/lib/stages";

export const dynamic = "force-dynamic";

/**
 * The command center — the front door. Answers, in order:
 * what's my next move (the balls), who is depending on me, what's mine
 * in flight, with the cohort's pulse one glance away.
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
            className="mt-4 inline-block rounded bg-ball px-4 py-2 font-mono text-sm font-bold text-court hover:bg-ball-deep"
          >
            sign in
          </Link>
        </main>
      </div>
    );
  }

  const [me] = await db.select().from(users).where(eq(users.id, userId));

  const myBalls = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.ballHolderId, userId), isNull(projects.archivedAt))
    )
    .orderBy(asc(projects.updatedAt));

  const waitingOnMe = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      projectName: projects.name,
      whatNeeded: tasks.blockedWhatNeeded,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.status, "blocked"),
        eq(tasks.blockedUnblockerId, userId),
        isNull(tasks.archivedAt)
      )
    );

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
        {/* Cohort pulse strip: the team, one glance, zero rank */}
        <Link
          href="/projects"
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

        <h1 className="mt-8 font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
          {me?.name ?? "you"}
        </h1>

        {/* The balls: next actions with handles */}
        <section className="mt-6">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            your balls · {myBalls.length}
          </h2>
          {myBalls.length === 0 ? (
            <p className="mt-2 font-mono text-sm text-faint">
              Nothing in your court.{" "}
              <Link href="/projects" className="text-ball hover:underline">
                Browse projects →
              </Link>
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myBalls.map((p) => (
                <li key={p.id}>
                  {/* The ball is a button: the next step, and a door into it */}
                  <Link
                    href={`/projects/${p.id}`}
                    className="group flex items-center gap-3 rounded border border-ball/40 bg-panel p-4 transition-all hover:border-ball hover:shadow-[0_0_16px_rgba(200,245,34,0.15)]"
                  >
                    <span className="ball-dot shrink-0" />
                    <span className="flex-1">
                      <span className="block font-display text-base font-bold text-ink">
                        {p.nextAction ?? "set the next move"}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted">
                        {p.name} · {p.stage}
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
              ))}
            </ul>
          )}
        </section>

        {/* Mutuality: who is depending on me */}
        {waitingOnMe.length > 0 && (
          <section className="mt-8">
            <h2 className="font-mono text-[11px] uppercase tracking-wide text-amber">
              waiting on you · {waitingOnMe.length}
            </h2>
            <ul className="mt-3 space-y-2">
              {waitingOnMe.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/projects/${t.projectId}`}
                    className="block rounded border border-amber/40 bg-panel p-3 transition-colors hover:border-amber"
                  >
                    <span className="font-mono text-sm text-ink">{t.title}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-muted">
                      {t.projectName} · needs: {t.whatNeeded}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
                          t.status === "blocked" ? "text-amber" : "text-ball"
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
