import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { emitEvent } from "@/lib/events";

/** A pass uncaught this long is a drop (ratified: visible, no-fault). */
export const RALLY_DROP_HOURS = 24;
export const RALLY_DROP_MS = RALLY_DROP_HOURS * 60 * 60 * 1000;

/**
 * Register overdue drops: any live project whose pass has been in the air
 * past the limit. Called lazily from the pages that render ball state —
 * no cron needed at pilot scale. The UPDATE claims rows atomically, so
 * concurrent sweeps can't double-drop; the ball returns to the passer
 * (an uncaught pass comes back to you), the rally resets, the drop lands
 * on the project's record with no one named.
 */
export async function sweepDrops() {
  try {
    // SET reads old row values on the right-hand side, RETURNING reads new
    // ones — so holder=passer happens in one statement, and the returned
    // ballHolderId IS the old passer.
    const dropped = await db
      .update(projects)
      .set({
        ballHolderId: sql`${projects.ballPasserId}`,
        ballPassedAt: null,
        ballPasserId: null,
        rallyCount: 0,
        updatedAt: new Date(),
      })
      .where(
        sql`${projects.ballPassedAt} < now() - interval '${sql.raw(String(RALLY_DROP_HOURS))} hours' and ${projects.archivedAt} is null`
      )
      .returning({
        id: projects.id,
        name: projects.name,
        passerId: projects.ballHolderId,
      });

    for (const p of dropped) {
      if (!p.passerId) continue;
      await emitEvent({
        kind: "ball_dropped",
        actorId: p.passerId,
        projectId: p.id,
        detail: `uncaught for ${RALLY_DROP_HOURS}h`,
      });
    }
  } catch {
    // Rendering must never fail over the sweep; the next page load retries.
  }
}
