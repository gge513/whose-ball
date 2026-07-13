"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saveUpdate, type WeeklyUpdate } from "@/lib/redis";

/**
 * Post (or update) the signed-in user's weekly update. Keyed on the
 * authenticated GitHub login, so a user can only post their own ball. Editable
 * until the week boundary (we just overwrite). Persists to Redis; no-ops with a
 * flag when Redis is not configured.
 */
export async function postUpdateAction(week: string, text: string) {
  const session = await auth();
  const login = session?.user?.login;
  if (!login) return { ok: false as const, reason: "auth" as const };

  const data: WeeklyUpdate = {
    assembled: text,
    approved: text,
    status: "posted",
    postedAt: new Date().toISOString(),
  };
  const res = await saveUpdate(login, week, data);
  revalidatePath("/");
  return { ok: true as const, configured: res.configured };
}
