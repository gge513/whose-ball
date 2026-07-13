"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";

import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { reviews, submissions, votes } from "@/lib/db/schema";
import { deepAssignmentsFor } from "@/lib/review-week";

/**
 * File (or correct) your written review of a peer: the GitHub issue URL.
 * Saving it is what unlocks your vote for that peer.
 * Invariants, all server-side: signed in; never your own submission;
 * only merged (eligible) submissions; URL must be a GitHub issue.
 */
export async function fileReviewAction(
  submissionId: number,
  formData: FormData
) {
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  // Trim whitespace AND stray punctuation that rides along when a URL is
  // copied out of chat/markdown — then validate both ends of the string.
  const issueUrl = String(formData.get("issueUrl") ?? "")
    .trim()
    .replace(/[).,\]>'"]+$/, "");
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(issueUrl)) {
    return; // not a GitHub issue URL
  }

  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!submission) return;
  if (submission.userId === userId) return; // no self-review
  if (!submission.mergedAt) return; // ineligible peer

  const eligible = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(isNotNull(submissions.mergedAt));
  const isDeep = deepAssignmentsFor(
    userId,
    eligible.map((s) => s.id)
  ).has(submissionId);

  await db
    .insert(reviews)
    .values({ reviewerId: userId, submissionId, issueUrl, isDeep })
    .onConflictDoUpdate({
      target: [reviews.reviewerId, reviews.submissionId],
      set: { issueUrl },
    });

  revalidatePath("/review");
}

/**
 * The private ballot: thumbs up or down, one per peer, changeable until
 * close. The gate: no saved review for that peer, no vote. Nothing in the
 * UI ever reads anyone else's vote or any count.
 */
export async function castVoteAction(
  submissionId: number,
  formData: FormData
) {
  const userId = await currentDbUserId();
  if (!userId) redirect("/signin");

  const thumbs = String(formData.get("thumbs") ?? "");
  if (thumbs !== "up" && thumbs !== "down") return;

  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!submission) return;
  if (submission.userId === userId) return; // no self-vote
  if (!submission.mergedAt) return; // ineligible

  // The review gate, enforced where it can't be bypassed:
  const reviewed = await db.query.reviews.findFirst({
    where: and(
      eq(reviews.reviewerId, userId),
      eq(reviews.submissionId, submissionId)
    ),
  });
  if (!reviewed) return;

  await db
    .insert(votes)
    .values({ voterId: userId, submissionId, thumbsUp: thumbs === "up" })
    .onConflictDoUpdate({
      target: [votes.voterId, votes.submissionId],
      set: { thumbsUp: thumbs === "up", castAt: new Date() },
    });

  revalidatePath("/review");
}
