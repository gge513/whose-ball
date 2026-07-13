/**
 * Review-week rhythm from the verified rulebook (peer-review-system.md):
 * Wed 14:00 — at least 10 of 29 reviews due; Fri 14:00 — all due;
 * Fri 16:00 — votes close. Dates provisional until kickoff confirms.
 */
export const REVIEW_WEEK = {
  wedCheckpoint: new Date("2026-07-22T18:00:00Z"), // Wed 14:00 ET
  allDue: new Date("2026-07-24T18:00:00Z"), // Fri 14:00 ET
  votesClose: new Date("2026-07-24T20:00:00Z"), // Fri 16:00 ET
  wedMinimum: 10,
} as const;

/**
 * Deep-review assignments (staff-assigned in the real pilot; deterministic
 * stand-in here): rotate the eligible list by reviewer id, take three.
 * Stable for a given cohort, different per reviewer, never includes self.
 */
export function deepAssignmentsFor(
  reviewerId: number,
  eligibleSubmissionIds: number[]
): Set<number> {
  const sorted = [...eligibleSubmissionIds].sort((a, b) => a - b);
  const rotated = sorted
    .slice(reviewerId % Math.max(sorted.length, 1))
    .concat(sorted.slice(0, reviewerId % Math.max(sorted.length, 1)));
  return new Set(rotated.slice(0, 3));
}
