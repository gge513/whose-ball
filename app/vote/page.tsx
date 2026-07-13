import { redirect } from "next/navigation";

/**
 * v1's public approval-voting console, retired: the verified rulebook's
 * vote is private, review-gated, and tally-free — it lives at /review.
 */
export default function VotePage() {
  redirect("/review");
}
