import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";

import { AuthButtons } from "@/app/components/auth-buttons";
import { MemberLink } from "@/app/components/member-link";
import { SiteHeader } from "@/app/components/site-header";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { currentWorkspace, workspacePeople } from "@/lib/workspace";

import { STAGE_ORDER } from "@/lib/stages";

import { createProjectAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const ws = await currentWorkspace();
  const rows = await db
    .select()
    .from(projects)
    .where(
      and(isNull(projects.archivedAt), eq(projects.workspaceId, ws.id))
    )
    .orderBy(asc(projects.createdAt));

  const allTasks = await db
    .select({ id: tasks.id, projectId: tasks.projectId, status: tasks.status })
    .from(tasks)
    .where(isNull(tasks.archivedAt));

  const people = await workspacePeople();
  const nameOf = (id: number | null) =>
    people.find((p) => p.id === id)?.name ?? null;

  return (
    <div className="min-h-screen">
      <SiteHeader active="projects" auth={<AuthButtons />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
              Projects
            </h1>
            <p className="mt-1 font-mono text-xs text-muted">
              every project: a trajectory, a ball, a holder
            </p>
          </div>

          {/* Instant creation: a name is all it takes. */}
          <form action={createProjectAction} className="flex items-center gap-2">
            <input
              name="name"
              required
              placeholder="new project name"
              className="rounded border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-muted focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-ink px-3 py-2 font-mono text-sm font-bold text-court transition-colors hover:bg-white"
            >
              create
            </button>
          </form>
        </div>

        {rows.length === 0 ? (
          <p className="rounded border border-line bg-panel p-6 font-mono text-sm text-muted">
            No projects yet. Create the first one above — a name is all it
            takes.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((p) => {
              const projectTasks = allTasks.filter(
                (t) => t.projectId === p.id
              );
              const done = projectTasks.filter(
                (t) => t.status === "done"
              ).length;
              const blocked = projectTasks.filter(
                (t) => t.status === "blocked"
              ).length;
              const stageIdx = STAGE_ORDER.indexOf(p.stage);

              return (
                <li key={p.id}>
                  <div className="block rounded border border-line bg-panel p-5 transition-colors hover:border-muted">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-display text-lg font-bold text-ink hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
                        {STAGE_ORDER.map((s, i) => (
                          <span
                            key={s}
                            className={
                              i === stageIdx
                                ? "rounded bg-ink px-1.5 py-0.5 font-bold text-court"
                                : i < stageIdx
                                  ? "text-posted"
                                  : "text-faint"
                            }
                          >
                            {s}
                          </span>
                        ))}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-xs">
                      {p.nextAction ? (
                        <span className="flex items-center gap-2 text-ink">
                          <span className="ball-dot" />
                          {p.nextAction}
                          {nameOf(p.ballHolderId) && (
                            <span className="text-muted">
                              ·{" "}
                              <MemberLink
                                id={p.ballHolderId}
                                name={nameOf(p.ballHolderId)}
                              />
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-faint">
                          no ball set — what&apos;s the next move?
                        </span>
                      )}
                      <span className="text-muted">
                        {done}/{projectTasks.length} tasks done
                      </span>
                      {blocked > 0 && (
                        <span className="text-amber">
                          {blocked} blocked
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
