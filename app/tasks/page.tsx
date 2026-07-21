import Link from "next/link";
import { and, asc, eq, isNull, type SQL } from "drizzle-orm";

import { AuthButtons } from "@/app/components/auth-buttons";
import { MemberLink } from "@/app/components/member-link";
import { SiteHeader } from "@/app/components/site-header";
import { db } from "@/lib/db";
import { projects, tasks, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const STATUSES = ["todo", "building", "verifying", "done", "blocked"] as const;

/**
 * The baseline's task list view: every live task, filterable by assignee,
 * status, and project. Filters are plain GET params — shareable URLs,
 * no client state.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    assignee?: string;
    status?: string;
    project?: string;
  }>;
}) {
  const { assignee, status, project } = await searchParams;

  const conditions: SQL[] = [isNull(tasks.archivedAt)];
  if (assignee) conditions.push(eq(tasks.assigneeId, Number(assignee)));
  if (status && (STATUSES as readonly string[]).includes(status))
    conditions.push(eq(tasks.status, status as (typeof STATUSES)[number]));
  if (project) conditions.push(eq(tasks.projectId, Number(project)));

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      projectId: tasks.projectId,
      projectName: projects.name,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.createdAt));

  const people = await db.select().from(users);
  const projectList = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(isNull(projects.archivedAt));

  return (
    <div className="min-h-screen">
      <SiteHeader active="tasks" auth={<AuthButtons />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
          Tasks
        </h1>

        {/* GET form: submitting rewrites the query string, the server filters. */}
        <form method="GET" className="mt-5 flex flex-wrap items-center gap-2">
          <select
            name="assignee"
            defaultValue={assignee ?? ""}
            className="rounded border border-line bg-panel px-2 py-2 font-mono text-xs text-ink"
          >
            <option value="">any assignee</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded border border-line bg-panel px-2 py-2 font-mono text-xs text-ink"
          >
            <option value="">any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="project"
            defaultValue={project ?? ""}
            className="rounded border border-line bg-panel px-2 py-2 font-mono text-xs text-ink"
          >
            <option value="">any project</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded border border-line px-3 py-2 font-mono text-xs text-ink hover:border-muted"
          >
            filter
          </button>
          {(assignee || status || project) && (
            <Link
              href="/tasks"
              className="font-mono text-xs text-faint hover:text-muted"
            >
              clear
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          <p className="mt-6 rounded border border-line bg-panel p-6 font-mono text-sm text-muted">
            No tasks match.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-line-soft rounded border border-line bg-panel">
            {rows.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-panel-2"
              >
                <Link
                  href={`/projects/${t.projectId}`}
                  className="font-mono text-sm text-ink hover:underline"
                >
                  {t.title}
                </Link>
                <span className="flex items-center gap-4 font-mono text-[11px]">
                  <Link
                    href={`/projects/${t.projectId}`}
                    className="text-muted hover:text-ink"
                  >
                    {t.projectName}
                  </Link>
                  <MemberLink
                    id={t.assigneeId}
                    name={t.assigneeName ?? "unassigned"}
                    className="text-faint"
                  />
                  <span
                    className={
                      t.status === "done"
                        ? "text-posted"
                        : t.status === "blocked"
                          ? "text-amber"
                          : "text-ink"
                    }
                  >
                    {t.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
