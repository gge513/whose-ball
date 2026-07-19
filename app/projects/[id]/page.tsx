import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, isNull, and } from "drizzle-orm";

import { AdvanceGate } from "@/app/components/advance-gate";
import { AuthButtons } from "@/app/components/auth-buttons";
import { MemberLink } from "@/app/components/member-link";
import { SiteHeader } from "@/app/components/site-header";
import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { projects, tasks, users } from "@/lib/db/schema";
import { fmtElapsed } from "@/lib/events";
import { requestNowMs } from "@/lib/journey";
import { sweepDrops } from "@/lib/rally";
import { sweepWhistles } from "@/lib/whistle";

import { STAGE_ORDER } from "@/lib/stages";

import {
  advanceStageAction,
  archiveProjectAction,
  archiveTaskAction,
  catchBallAction,
  createTaskAction,
  defineProjectAction,
  moveTaskAction,
  retreatStageAction,
  setBallAction,
} from "../actions";

export const dynamic = "force-dynamic";

const FLOW = ["todo", "building", "verifying", "done"] as const;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) notFound();

  await sweepDrops(); // overdue passes become drops before we render
  await sweepWhistles(); // then still balls get whistled (drops reset the clock)

  const viewerId = await currentDbUserId();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.archivedAt) notFound();

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.archivedAt)))
    .orderBy(asc(tasks.createdAt));

  const people = await db.select().from(users);
  const nameOf = (uid: number | null) =>
    people.find((p) => p.id === uid)?.name ?? "—";

  const stageIdx = STAGE_ORDER.indexOf(project.stage);
  const defined = Boolean(
    project.whoBenefits && project.whatChanges && project.doneLooksLike
  );
  const moving = projectTasks.some((t) => t.status !== "todo");
  const showNudge = project.stage === "define" && moving && !defined;
  const blockedTasks = projectTasks.filter((t) => t.status === "blocked");

  // The split-it remedy lands here with the form already open — the
  // whistled holder shouldn't have to find the button they were sent to.
  const whistleWantsSplit =
    project.whistleBlownAt !== null &&
    project.whistleCause === "too_big" &&
    viewerId === project.ballHolderId;

  const advance = advanceStageAction.bind(null, project.id);
  const retreatStage = retreatStageAction.bind(null, project.id);
  const define = defineProjectAction.bind(null, project.id);
  const setBall = setBallAction.bind(null, project.id);
  const addTask = createTaskAction.bind(null, project.id);
  const archiveProject = archiveProjectAction.bind(null, project.id);

  return (
    <div className="min-h-screen">
      <SiteHeader active="projects" auth={<AuthButtons />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/projects"
          className="font-mono text-xs text-faint hover:text-muted"
        >
          ← all projects
        </Link>

        {/* Trajectory strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
            {project.name}
          </h1>
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
            {STAGE_ORDER.map((s, i) => (
              <span
                key={s}
                className={
                  i === stageIdx
                    ? "rounded bg-ball px-2 py-1 font-bold text-court"
                    : i < stageIdx
                      ? "text-posted"
                      : "text-faint"
                }
              >
                {s}
              </span>
            ))}
            <AdvanceGate
              advance={advance}
              retreat={stageIdx > 0 ? retreatStage : null}
              locked={project.stage === "define" && !defined}
              questions={[
                { label: "who benefits?", answered: !!project.whoBenefits },
                {
                  label: "what changes when this ships?",
                  answered: !!project.whatChanges,
                },
                {
                  label: "what does done look like?",
                  answered: !!project.doneLooksLike,
                },
              ]}
              nextStage={
                stageIdx < STAGE_ORDER.length - 1
                  ? STAGE_ORDER[stageIdx + 1]
                  : null
              }
              prevStage={stageIdx > 0 ? STAGE_ORDER[stageIdx - 1] : null}
            />
          </div>
        </div>

        {showNudge && (
          <p className="mt-4 rounded border border-amber/40 bg-panel px-4 py-3 font-mono text-xs text-amber">
            This project is moving but still undefined — want to define it
            below? (Work is never blocked; only the story waits.)
          </p>
        )}

        {/* The ball */}
        <section className="mt-6 rounded border border-ball/30 bg-panel p-5">
          <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wide text-muted">
            the ball
            {project.rallyCount > 0 && (
              <span
                className="rounded border border-ball/50 px-1.5 py-0.5 text-[10px] text-ball"
                title="consecutive clean catches on this project"
              >
                rally · {project.rallyCount}
              </span>
            )}
          </h2>
          {project.ballPassedAt ? (
            <div className="mt-2">
              <p className="flex items-center gap-2.5 font-display text-lg font-bold text-ink">
                <span className="ball-dot" />
                in the air →{" "}
                <MemberLink
                  id={project.ballHolderId}
                  name={nameOf(project.ballHolderId)}
                />
                <span className="font-mono text-xs font-normal text-muted">
                  · from{" "}
                  <MemberLink
                    id={project.ballPasserId}
                    name={nameOf(project.ballPasserId)}
                  />{" "}
                  ·{" "}
                  {fmtElapsed(
                    (requestNowMs() - project.ballPassedAt.getTime()) / 1000
                  )}{" "}
                  up
                </span>
              </p>
              {project.nextAction && (
                <p className="mt-1 font-mono text-xs text-muted">
                  the ask: {project.nextAction}
                </p>
              )}
              {viewerId === project.ballHolderId ? (
                <form
                  action={catchBallAction.bind(null, project.id)}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  <input
                    name="firstAction"
                    required
                    placeholder="name your first action to catch it"
                    className="min-w-64 flex-1 rounded border border-ball/40 bg-panel-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-ball focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded bg-ball px-3 py-2 font-mono text-sm font-bold text-court hover:bg-ball-deep"
                  >
                    catch
                  </button>
                </form>
              ) : (
                <p className="mt-2 font-mono text-[11px] text-faint">
                  theirs when they catch it — uncaught for 24h is a drop
                </p>
              )}
            </div>
          ) : project.ballHolderId ? (
            /* One existence test everywhere (tune-list #2): a ball is a
               holder — same predicate as /me and the whistle sweep. A
               holder with a blank action is a pre-guard row; it renders
               honestly instead of vanishing, whistle badge included. */
            <p className="mt-2 flex items-center gap-2.5 font-display text-lg font-bold text-ink">
              <span className="ball-dot" />
              {project.nextAction ?? (
                <span className="text-faint">the next move needs a name</span>
              )}
              <span className="font-mono text-xs font-normal text-muted">
                ·{" "}
                <MemberLink
                  id={project.ballHolderId}
                  name={nameOf(project.ballHolderId)}
                />
                {project.whistleBlownAt && (
                  <span className="text-amber">
                    {" "}
                    · whistled — still too long; the holder picks it up on
                    their command center
                  </span>
                )}
                {project.nextActionCommittedFor &&
                  project.nextActionCommittedFor > new Date() &&
                  ` · committed for ${project.nextActionCommittedFor.toLocaleDateString()}`}
              </span>
            </p>
          ) : (
            <p className="mt-2 font-mono text-sm text-faint">
              No ball set. What&apos;s the next move, and whose is it?
            </p>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer font-mono text-xs text-muted hover:text-ink">
              set or pass the ball
            </summary>
            <form action={setBall} className="mt-3 flex flex-wrap gap-2">
              <input
                name="nextAction"
                required
                defaultValue={project.nextAction ?? ""}
                placeholder="one concrete next action"
                className="min-w-64 flex-1 rounded border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-ball focus:outline-none"
              />
              <select
                name="ballHolderId"
                required
                defaultValue={project.ballHolderId ?? ""}
                className="rounded border border-line bg-panel-2 px-2 py-2 font-mono text-sm text-ink"
              >
                <option value="">holder…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="committedFor"
                className="rounded border border-line bg-panel-2 px-2 py-2 font-mono text-sm text-muted"
                title="optional: when will you next work on this?"
              />
              <button
                type="submit"
                className="rounded bg-ball px-3 py-2 font-mono text-sm font-bold text-court hover:bg-ball-deep"
              >
                set
              </button>
              <p className="w-full font-mono text-[10px] text-faint">
                picking someone else puts it in the air — it&apos;s theirs
                when they catch it by naming their first action
              </p>
            </form>
          </details>
        </section>

        {/* Define */}
        <section
          id="define-panel"
          className="mt-4 rounded border border-line bg-panel p-5"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            define{" "}
            {defined ? (
              <span className="text-posted">· answered</span>
            ) : (
              <span className="text-faint">
                · three questions unlock the trajectory
              </span>
            )}
          </h2>
          <form action={define} className="mt-3 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["whoBenefits", "who benefits?", project.whoBenefits],
                ["whatChanges", "what changes when this ships?", project.whatChanges],
                ["doneLooksLike", "what does done look like?", project.doneLooksLike],
              ] as const
            ).map(([name, label, value]) => (
              <label key={name} className="block">
                <span className="font-mono text-[11px] text-muted">{label}</span>
                <textarea
                  name={name}
                  rows={2}
                  defaultValue={value ?? ""}
                  className="mt-1 w-full rounded border border-line bg-panel-2 px-2.5 py-2 font-mono text-xs text-ink focus:border-ball focus:outline-none"
                />
              </label>
            ))}
            <button
              type="submit"
              className="w-fit rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-ball hover:text-ink"
            >
              save answers
            </button>
          </form>
        </section>

        {/* Blocked — help wanted, visible */}
        {blockedTasks.length > 0 && (
          <section className="mt-4 rounded border border-amber/40 bg-panel p-5">
            <h2 className="font-mono text-[11px] uppercase tracking-wide text-amber">
              blocked · help wanted
            </h2>
            <ul className="mt-2 space-y-2">
              {blockedTasks.map((t) => (
                <li key={t.id} className="font-mono text-xs text-ink">
                  <span className="font-bold">{t.title}</span>
                  <span className="text-muted">
                    {" "}
                    — tried: {t.blockedWhatTried} · needs: {t.blockedWhatNeeded}{" "}
                    · can unblock:{" "}
                    <MemberLink
                      id={t.blockedUnblockerId}
                      name={nameOf(t.blockedUnblockerId)}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Task board. The ids are remedy landing spots: the whistle's
            split-it routes to #new-task, the help causes to #task-list. */}
        <section id="task-list" className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
              tasks
            </h2>
            <details id="new-task" open={whistleWantsSplit}>
              <summary className="cursor-pointer rounded bg-ball px-3 py-1.5 font-mono text-xs font-bold text-court hover:bg-ball-deep">
                + new task
              </summary>
              <form
                action={addTask}
                className="absolute right-6 z-10 mt-2 w-80 space-y-2 rounded border border-line bg-panel-2 p-4 shadow-xl"
              >
                <input
                  name="title"
                  required
                  placeholder="task title"
                  className="w-full rounded border border-line bg-panel px-2.5 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-ball focus:outline-none"
                />
                <textarea
                  name="description"
                  rows={2}
                  placeholder="description (optional)"
                  className="w-full rounded border border-line bg-panel px-2.5 py-2 font-mono text-xs text-ink placeholder:text-faint"
                />
                <input
                  name="definitionOfDone"
                  placeholder="definition of done (optional)"
                  className="w-full rounded border border-line bg-panel px-2.5 py-2 font-mono text-xs text-ink placeholder:text-faint"
                />
                <select
                  name="assigneeId"
                  className="w-full rounded border border-line bg-panel px-2 py-2 font-mono text-sm text-muted"
                >
                  <option value="">assignee…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded bg-ball px-3 py-1.5 font-mono text-xs font-bold text-court hover:bg-ball-deep"
                >
                  create task
                </button>
              </form>
            </details>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((col) => (
              <div key={col} className="rounded border border-line bg-court-2 p-3">
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                  {col}{" "}
                  <span className="text-faint">
                    {projectTasks.filter((t) => t.status === col).length}
                  </span>
                </h3>
                <ul className="space-y-2">
                  {projectTasks
                    .filter((t) => t.status === col)
                    .map((t) => {
                      const move = moveTaskAction.bind(null, t.id, project.id);
                      const archive = archiveTaskAction.bind(
                        null,
                        t.id,
                        project.id
                      );
                      return (
                        <li
                          key={t.id}
                          className="rounded border border-line bg-panel p-3"
                        >
                          <p className="font-mono text-sm text-ink">{t.title}</p>
                          {t.assigneeId && (
                            <p className="mt-1 font-mono text-[11px] text-muted">
                              <MemberLink
                                id={t.assigneeId}
                                name={nameOf(t.assigneeId)}
                              />
                            </p>
                          )}
                          {t.definitionOfDone && (
                            <p className="mt-1 font-mono text-[11px] text-faint">
                              done = {t.definitionOfDone}
                            </p>
                          )}

                          <form action={move} className="mt-2 flex gap-1.5">
                            <select
                              name="status"
                              defaultValue={t.status}
                              className="flex-1 rounded border border-line bg-panel-2 px-1.5 py-1 font-mono text-[11px] text-muted"
                            >
                              {FLOW.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded border border-line px-2 py-1 font-mono text-[11px] text-muted hover:border-ball hover:text-ink"
                            >
                              move
                            </button>
                          </form>

                          <details className="mt-2">
                            <summary className="cursor-pointer font-mono text-[11px] text-faint hover:text-amber">
                              blocked?
                            </summary>
                            <form action={move} className="mt-2 space-y-1.5">
                              <input type="hidden" name="status" value="blocked" />
                              <input
                                name="blockedWhatTried"
                                required
                                placeholder="what did you try?"
                                className="w-full rounded border border-line bg-panel-2 px-2 py-1 font-mono text-[11px] text-ink placeholder:text-faint"
                              />
                              <input
                                name="blockedWhatNeeded"
                                required
                                placeholder="what do you need?"
                                className="w-full rounded border border-line bg-panel-2 px-2 py-1 font-mono text-[11px] text-ink placeholder:text-faint"
                              />
                              <select
                                name="blockedUnblockerId"
                                required
                                className="w-full rounded border border-line bg-panel-2 px-1.5 py-1 font-mono text-[11px] text-muted"
                              >
                                <option value="">who can unblock?</option>
                                {people.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="rounded border border-amber/50 px-2 py-1 font-mono text-[11px] text-amber"
                              >
                                mark blocked
                              </button>
                            </form>
                          </details>

                          <form action={archive} className="mt-1.5">
                            <button
                              type="submit"
                              className="font-mono text-[10px] text-faint hover:text-muted"
                            >
                              archive
                            </button>
                          </form>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>

          {/* Blocked tasks also need a way back into the flow */}
          {blockedTasks.length > 0 && (
            <div className="mt-3 rounded border border-line bg-court-2 p-3">
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-amber">
                blocked {blockedTasks.length}
              </h3>
              <ul className="space-y-2">
                {blockedTasks.map((t) => {
                  const move = moveTaskAction.bind(null, t.id, project.id);
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded border border-amber/30 bg-panel p-3"
                    >
                      <span className="font-mono text-sm text-ink">
                        {t.title}
                      </span>
                      <form action={move} className="flex gap-1.5">
                        <select
                          name="status"
                          defaultValue="building"
                          className="rounded border border-line bg-panel-2 px-1.5 py-1 font-mono text-[11px] text-muted"
                        >
                          {FLOW.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded border border-line px-2 py-1 font-mono text-[11px] text-muted hover:border-ball hover:text-ink"
                        >
                          unblock →
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <form action={archiveProject} className="mt-10 border-t border-line-soft pt-4">
          <button
            type="submit"
            className="font-mono text-[11px] text-faint hover:text-amber"
          >
            archive this project
          </button>
        </form>
      </main>
    </div>
  );
}
