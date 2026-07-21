import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";

/**
 * Single-workspace era: every session lives in the founding workspace
 * (the cohort, seeded by migration 0007). Workspace selection arrives
 * with workspace #2 — every caller routes through here so that day is
 * a one-module change, not a hunt through the pages.
 */
export async function currentWorkspace() {
  const [ws] = await db
    .select()
    .from(workspaces)
    .orderBy(asc(workspaces.id))
    .limit(1);
  if (!ws) {
    throw new Error("No workspace exists — migration 0007 seeds the first.");
  }
  return ws;
}

/** The people of the current workspace — the only roster scoped UIs read. */
export async function workspacePeople() {
  const ws = await currentWorkspace();
  return db
    .select({
      id: users.id,
      email: users.email,
      githubLogin: users.githubLogin,
      name: users.name,
      avatarUrl: users.avatarUrl,
      passwordHash: users.passwordHash,
      createdAt: users.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, ws.id));
}

/**
 * Every new account joins the founding workspace — a user with no
 * membership is invisible to every scoped query. Fire-and-forget like
 * emitEvent: enrollment failing must never fail the signup that
 * triggered it.
 */
export async function enrollInDefaultWorkspace(userId: number) {
  try {
    const ws = await currentWorkspace();
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: ws.id, userId })
      .onConflictDoNothing();
  } catch {
    // Signup already happened; a missing membership row is repairable,
    // a failed signup is a locked-out person.
  }
}
