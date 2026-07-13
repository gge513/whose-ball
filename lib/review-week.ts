/**
 * Week 1 rhythm — CONFIRMED from George's signed-in dashboard, 2026-07-13:
 * submission PR merged by Sun Jul 19 17:00 ET (unmerged = ineligible);
 * written reviews + private votes due Mon Jul 20 14:00 ET (window closes).
 * Cohort 59 enrolled → 58 reviews/votes. No Wed checkpoint in the live
 * rules (that was the retired repo-doc model).
 */
export const REVIEW_WEEK = {
  submissionMergeDeadline: new Date("2026-07-19T21:00:00Z"), // Sun 17:00 EDT
  reviewsAndVotesClose: new Date("2026-07-20T18:00:00Z"), // Mon 14:00 EDT
} as const;

/**
 * Deep-review assignments: in the repo docs staff assigned 3 primary deep
 * reviews; the live site doesn't mention them. Kept as a soft internal
 * marker (rotate the eligible list by reviewer id, take three) until the
 * kickoff call clarifies — harmless if the rule is gone.
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
