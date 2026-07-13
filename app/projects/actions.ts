"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { emitEvent } from "@/lib/events";
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

/** The ball: one next action, one holder, optional quiet when-commitment. */
export async function setBallAction(projectId: number, formData: FormData) {
  const nextAction = str(formData, "nextAction");
  const holder = str(formData, "ballHolderId");
  const committedFor = str(formData, "committedFor");

  await db
    .update(projects)
    .set({
      nextAction,
      ballHolderId: holder ? Number(holder) : null,
      nextActionCommittedFor: committedFor ? new Date(committedFor) : null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
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
  } else if (status === "blocked") {
    await emitEvent({
      kind: "blocker_raised",
      actorId: userId,
      projectId,
      taskId,
      detail: before.title,
    });
  } else if (before.status === "blocked") {
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
