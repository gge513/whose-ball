import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { emitEvent } from "@/lib/events";

/**
 * A held ball with no recorded motion this long gets whistled (locked:
 * 48h — in a one-week project the referee speaks once, maybe twice).
 */
export const WHISTLE_STILL_HOURS = 48;

export type WhistleCause = (typeof projects.whistleCause.enumValues)[number];

/**
 * The cause-typed pickup (ratified: the intervention matches the cause,
 * and the whistle never ships without the routed remedies). `inline`
 * remedies are one field on the pickup card, exactly like the catch;
 * `navigate` remedies land on the project page where the real multi-field
 * form lives, and the whistle clears only when that artifact exists.
 */
export const WHISTLE_CAUSES: Record<
  WhistleCause,
  {
    label: string; // the one-tap button, in the holder's words
    remedy: string; // what happens next, named up front
    mode: "inline_define" | "inline_evidence" | "navigate";
    anchor?: string; // where on the project page the remedy form lives
  }
> = {
  unclear: {
    label: "next action unclear",
    remedy: "define it",
    mode: "inline_define",
  },
  too_big: {
    label: "too big",
    remedy: "split it — add the first smaller task",
    mode: "navigate",
    anchor: "#new-task",
  },
  missing_skill: {
    label: "missing a skill",
    remedy: "ask for help — raise a blocker naming who can help",
    mode: "navigate",
    anchor: "#task-list",
  },
  waiting: {
    label: "waiting on someone",
    remedy: "name the unblocker — raise the blocker",
    mode: "navigate",
    anchor: "#task-list",
  },
  moving: {
    label: "actually moving",
    remedy: "link the evidence",
    mode: "inline_evidence",
  },
};

/**
 * Blow overdue whistles: any live project whose ball is HELD (not in the
 * air — a pass has its own clock) with no recorded motion for 48h.
 * Motion is anything the system can see: a project edit, a task move, an
 * event. Same lazy-sweep contract as sweepDrops — called from the pages
 * that render ball state, UPDATE claims rows atomically, and a whistle
 * already live never re-fires.
 */
export async function sweepWhistles() {
  try {
    const blown = await db
      .update(projects)
      .set({ whistleBlownAt: new Date() })
      .where(
        sql`${projects.archivedAt} is null
          and ${projects.ballHolderId} is not null
          and ${projects.ballPassedAt} is null
          and ${projects.whistleBlownAt} is null
          and greatest(
            ${projects.updatedAt},
            coalesce((select max(t.updated_at) from tasks t where t.project_id = ${projects.id} and t.archived_at is null), ${projects.updatedAt}),
            coalesce((select max(e.created_at) from events e where e.project_id = ${projects.id}), ${projects.updatedAt})
          ) < now() - interval '${sql.raw(String(WHISTLE_STILL_HOURS))} hours'`
      )
      .returning({ id: projects.id, holderId: projects.ballHolderId });

    for (const p of blown) {
      if (!p.holderId) continue;
      // Public and actorless (locked): the feed states the stillness,
      // names no one, and never carries the cause.
      await emitEvent({
        kind: "whistle_blown",
        actorId: p.holderId,
        projectId: p.id,
        detail: `still for ${WHISTLE_STILL_HOURS}h`,
      });
    }
  } catch {
    // Rendering must never fail over the sweep; the next page load retries.
  }
}
