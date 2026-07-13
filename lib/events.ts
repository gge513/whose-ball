import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { events, projects, tasks, users } from "@/lib/db/schema";

export type EventKind = (typeof events.kind.enumValues)[number];

/**
 * Append one row to the shipping log. Fire-and-forget by design: the log
 * is a byproduct of real work, so a failed event write must never fail
 * the action that did the work.
 */
export async function emitEvent(e: {
  kind: EventKind;
  actorId: number;
  projectId?: number;
  taskId?: number;
  detail?: string;
}) {
  try {
    await db.insert(events).values({
      kind: e.kind,
      actorId: e.actorId,
      projectId: e.projectId ?? null,
      taskId: e.taskId ?? null,
      detail: e.detail ?? null,
    });
  } catch {
    // The work already happened; losing one feed line is acceptable,
    // failing the user's action over it is not.
  }
}

export type FeedItem = {
  id: number;
  kind: EventKind;
  actorName: string;
  actorLogin: string | null;
  projectId: number | null;
  projectName: string | null;
  detail: string | null;
  createdAt: Date;
};

/** The shipping feed: newest first, joined for display, hard-capped. */
export async function loadFeed(limit = 50): Promise<FeedItem[]> {
  const actor = alias(users, "actor");
  return db
    .select({
      id: events.id,
      kind: events.kind,
      actorName: actor.name,
      actorLogin: actor.githubLogin,
      projectId: events.projectId,
      projectName: projects.name,
      detail: events.detail,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(actor, eq(events.actorId, actor.id))
    .leftJoin(projects, eq(events.projectId, projects.id))
    .orderBy(desc(events.createdAt), desc(events.id))
    .limit(limit);
}

export type MomentumTiles = {
  projectsLive: number;
  shipped: number;
  tasksDoneThisWeek: number;
  reviewsFiled: number;
  openHelpRequests: number;
};

/**
 * The collective tiles: cohort-wide counts only. Nothing here is ever
 * broken down per person — movement is public, comparison is not.
 */
export async function loadMomentumTiles(): Promise<MomentumTiles> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [live] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(sql`${projects.archivedAt} is null`);

  const [shipped] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(
      sql`${projects.archivedAt} is null and ${projects.stage} in ('ship', 'teach')`
    );

  const [doneWeek] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(
      sql`${events.kind} = 'task_done' and ${events.createdAt} >= ${weekAgo}`
    );

  const [reviewsFiled] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(eq(events.kind, "review_filed"));

  const [help] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tasks)
    .where(sql`${tasks.status} = 'blocked' and ${tasks.archivedAt} is null`);

  return {
    projectsLive: live.n,
    shipped: shipped.n,
    tasksDoneThisWeek: doneWeek.n,
    reviewsFiled: reviewsFiled.n,
    openHelpRequests: help.n,
  };
}

/** Feed line grammar: kind → verb phrase. One place, so the voice is one voice. */
export function feedLine(item: FeedItem): string {
  switch (item.kind) {
    case "project_created":
      return `started ${item.projectName ?? "a project"}`;
    case "stage_advanced":
      return `moved ${item.projectName ?? "a project"} to ${item.detail}`;
    case "task_done":
      return `shipped "${item.detail}"`;
    case "blocker_raised":
      return `asked for help on "${item.detail}"`;
    case "blocker_cleared":
      return `got unblocked on "${item.detail}"`;
    case "review_filed":
      return `filed a review`;
    case "submission_merged":
      return `merged their submission PR`;
  }
}
