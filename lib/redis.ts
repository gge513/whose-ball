import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client + helpers (votes + weekly update blobs).
 *
 * Storage decision (plan Decision 1): votes are a Redis Set per submission,
 * which makes "one approval per voter" true by construction and gives free
 * toggle + count. Weekly updates are JSON blobs keyed by user + week.
 *
 * Everything degrades gracefully when Redis is not configured (no env vars),
 * so the app runs locally before the Upstash integration is added. Callers get
 * a `configured: false` flag rather than a thrown error.
 */

let client: Redis | null = null;

function getRedis(): Redis | null {
  if (client) return client;
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}

export type WeeklyUpdate = {
  assembled: string;
  draft?: string;
  approved?: string;
  status: "ready" | "draft-ready" | "posted" | "quiet-week";
  postedAt?: string;
};

/**
 * Toggle a voter's approval for a submission. Returns the new count and
 * whether the user is now a voter. Server-enforced uniqueness via the Set.
 */
export async function toggleVote(submissionId: string, voterId: string) {
  const redis = getRedis();
  if (!redis) return { count: 0, voted: false, configured: false };
  const key = `votes:${submissionId}`;
  const isVoter = await redis.sismember(key, voterId);
  if (isVoter) await redis.srem(key, voterId);
  else await redis.sadd(key, voterId);
  const count = await redis.scard(key);
  return { count, voted: !isVoter, configured: true };
}

/** Current vote count + whether this voter has voted (for initial render). */
export async function getVoteState(submissionId: string, voterId?: string) {
  const redis = getRedis();
  if (!redis) return { count: 0, voted: false, configured: false };
  const key = `votes:${submissionId}`;
  const count = await redis.scard(key);
  const voted = voterId ? (await redis.sismember(key, voterId)) === 1 : false;
  return { count, voted, configured: true };
}

export async function saveUpdate(
  userId: string,
  week: string,
  data: WeeklyUpdate,
) {
  const redis = getRedis();
  if (!redis) return { configured: false };
  await redis.set(`update:${userId}:${week}`, data);
  return { configured: true };
}

export async function getUpdate(userId: string, week: string) {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<WeeklyUpdate>(`update:${userId}:${week}`);
}

export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}
