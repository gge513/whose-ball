import { getSession } from "@/auth";

/**
 * The signed-in user's row id in the users table, or null.
 * The single source of "who is acting" for every server action.
 */
export async function currentDbUserId(): Promise<number | null> {
  const session = await getSession();
  return session?.user?.dbUserId ?? null;
}
