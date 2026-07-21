"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { currentWorkspace } from "@/lib/workspace";

/**
 * The workspace vision: one shared why, editable by any member — the same
 * flat-authz stance as the rest of the app (shared motion is the point;
 * archiving/ending things is what stays owner-scoped).
 */
export async function setVisionAction(formData: FormData) {
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  const raw = formData.get("vision");
  const vision =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;

  const ws = await currentWorkspace();
  await db.update(workspaces).set({ vision }).where(eq(workspaces.id, ws.id));

  revalidatePath("/momentum");
  revalidatePath("/me");
}
