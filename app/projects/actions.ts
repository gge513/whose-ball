"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { projects, tasks, users } from "@/lib/db/schema";
import { convertAssistsFor, emitEvent } from "@/lib/events";
import { RALLY_DROP_MS, sweepDrops } from "@/lib/rally";
import { STAGE_ORDER } from "@/lib/stages";

const TASK_STATUSES = [
  "todo",
  "building",
  "verifying",
  "done",
  "blocked",
] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Instant creation: a name is all it takes. The project starts in Define. */
export async function createProjectAction(formData: FormData) {
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  const name = str(formData, "name");
  if (!name) return;

  const [created] = await db
    .insert(projects)
    .values({ name, ownerId: userId })
    .returning({ id: projects.id });

  await emitEvent({
    kind: "project_created",
    actorId: userId,
    projectId: created.id,
  });

  revalidatePath("/projects");
  redirect(`/projects/${created.id}`);
}

/** The Define gate's content: answered whenever George is ready, not at creation. */
export async function defineProjectAction(
  projectId: number,
  formData: FormData
) {
  await db
    .update(projects)
    .set({
      whoBenefits: str(formData, "whoBenefits"),
      whatChanges: str(formData, "whatChanges"),
      doneLooksLike: str(formData, "doneLooksLike"),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  revalidatePath(`/projects/${projectId}`);
}

/**
 * Advance the trajectory one station. The only rule: leaving Define requires
 * the three meaning answers. Gates the story, never the work — tasks are
 * untouched by this.
 */
export async function advanceStageAction(projectId: number) {
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return;

  const idx = STAGE_ORDER.indexOf(project.stage);
  if (idx >= STAGE_ORDER.length - 1) return; // already at Teach

  const leavingDefine = project.stage === "define";
  const defined =
    project.whoBenefits && project.whatChanges && project.doneLooksLike;
  if (leavingDefine && !defined) return; // the gate

  const nextStage = STAGE_ORDER[idx + 1];
  await db
    .update(projects)
    .set({ stage: nextStage, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  await emitEvent({
    kind: "stage_advanced",
    actorId: userId,
    projectId,
    detail: nextStage,
  });

  revalidatePath(`/projects/${projectId}`);
}

/**
 * The ball: one next action, one holder, optional quiet when-commitment.
 * The rally rides on top: giving the ball to someone ELSE is a pass — it
 * goes in the air, and it's theirs only when they catch it. Keeping it
 * (yourself, or the same holder) is a plain edit and touches no rally
 * state.
 */
export async function setBallAction(projectId: number, formData: FormData) {
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  const nextAction = str(formData, "nextAction");
  const holder = str(formData, "ballHolderId");
  const committedFor = str(formData, "committedFor");
  const holderId = holder ? Number(holder) : null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return;

  const holderChanged = holderId !== project.ballHolderId;
  const isPass = holderChanged && holderId !== null && holderId !== userId;

  await db
    .update(projects)
    .set({
      nextAction,
      ballHolderId: holderId,
      nextActionCommittedFor: committedFor ? new Date(committedFor) : null,
      // A pass starts the clock; taking it yourself clears any stale air;
      // an unchanged holder is an edit and leaves the clock alone.
      ballPassedAt: holderChanged
        ? isPass
          ? new Date()
          : null
        : project.ballPassedAt,
      ballPasserId: holderChanged
        ? isPass
          ? userId
          : null
        : project.ballPasserId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  if (isPass) {
    const receiver = await db.query.users.findFirst({
      where: eq(users.id, holderId),
    });
    await emitEvent({
      kind: "ball_passed",
      actorId: userId,
      projectId,
      detail: receiver?.name ?? "someone",
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

/**
 * The catch: the pass becomes yours when you name your first action —
 * one field, and it becomes the project's next action. A catch attempted
 * past the drop limit registers the drop instead (the ball already hit
 * the ground; the page just hadn't noticed yet).
 */
export async function catchBallAction(projectId: number, formData: FormData) {
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  const firstAction = str(formData, "firstAction");
  if (!firstAction) return;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.archivedAt) return;
  if (!project.ballPassedAt || project.ballHolderId !== userId) return;

  const elapsedMs = Date.now() - project.ballPassedAt.getTime();
  if (elapsedMs > RALLY_DROP_MS) {
    await sweepDrops();
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/me");
    return;
  }

  await db
    .update(projects)
    .set({
      nextAction: firstAction,
      ballPassedAt: null,
      ballPasserId: null,
      rallyCount: project.rallyCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  await emitEvent({
    kind: "ball_caught",
    actorId: userId,
    projectId,
    detail: firstAction,
    elapsedS: Math.max(1, Math.floor(elapsedMs / 1000)),
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/me");
}

export async function createTaskAction(
  projectId: number,
  formData: FormData
) {
  const title = str(formData, "title");
  if (!title) return;

  const assignee = str(formData, "assigneeId");
  await db.insert(tasks).values({
    projectId,
    title,
    description: str(formData, "description"),
    definitionOfDone: str(formData, "definitionOfDone"),
    assigneeId: assignee ? Number(assignee) : null,
  });

  revalidatePath(`/projects/${projectId}`);
}

/**
 * Move a task through the light flow. Entering "blocked" requires the three
 * help fields (asking for help is structured, visible work); leaving it
 * clears them.
 */
export async function moveTaskAction(
  taskId: number,
  projectId: number,
  formData: FormData
) {
  // The feed needs to say WHO moved it, which surfaced that this action
  // never asked. Attribution forces authentication.
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  const status = str(formData, "status") as TaskStatus | null;
  if (!status || !TASK_STATUSES.includes(status)) return;

  const before = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });
  if (!before || before.status === status) return;

  if (status === "blocked") {
    const whatTried = str(formData, "blockedWhatTried");
    const whatNeeded = str(formData, "blockedWhatNeeded");
    const unblocker = str(formData, "blockedUnblockerId");
    if (!whatTried || !whatNeeded || !unblocker) return; // all three, always

    await db
      .update(tasks)
      .set({
        status,
        blockedWhatTried: whatTried,
        blockedWhatNeeded: whatNeeded,
        blockedUnblockerId: Number(unblocker),
        blockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));
  } else {
    await db
      .update(tasks)
      .set({
        status,
        blockedWhatTried: null,
        blockedWhatNeeded: null,
        blockedUnblockerId: null,
        blockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));
  }

  // The assist (ratified: the save is the scored act). Any exit from
  // "blocked" logs an assist to the member the blocker named — whoever
  // physically moved the task. Farming is accepted as low-risk: the
  // assist only converts when the task really ships.
  if (
    before.status === "blocked" &&
    status !== "blocked" &&
    before.blockedUnblockerId
  ) {
    await emitEvent({
      kind: "assist",
      actorId: before.blockedUnblockerId,
      projectId,
      taskId,
      detail: before.title,
    });
  }

  // One transition, at most one feed line. Done and blocked/unblocked are
  // the states someone else can feel; the rest is private motion.
  if (status === "done") {
    await emitEvent({
      kind: "task_done",
      actorId: userId,
      projectId,
      taskId,
      detail: before.title,
    });
    // Step two of the assist chain — runs after the assist emit above so
    // a straight blocked→done still converts in the same move.
    await convertAssistsFor(taskId, before.title, projectId);
  } else if (status === "blocked") {
    await emitEvent({
      kind: "blocker_raised",
      actorId: userId,
      projectId,
      taskId,
      detail: before.title,
    });
  } else if (
    before.status === "blocked" &&
    before.blockedUnblockerId !== userId
  ) {
    // When the named unblocker moved it themselves, the assist line above
    // already tells this story — one line per person per transition.
    await emitEvent({
      kind: "blocker_cleared",
      actorId: userId,
      projectId,
      taskId,
      detail: before.title,
    });
  }

  revalidatePath(`/projects/${projectId}`);
}

/** Archive, never destroy: ids stay retired, references keep resolving. */
export async function archiveTaskAction(taskId: number, projectId: number) {
  await db
    .update(tasks)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), isNull(tasks.archivedAt)));

  revalidatePath(`/projects/${projectId}`);
}

export async function archiveProjectAction(projectId: number) {
  await db
    .update(projects)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), isNull(projects.archivedAt)));

  revalidatePath("/projects");
  redirect("/projects");
}
