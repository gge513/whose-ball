import Link from "next/link";
import { eq } from "drizzle-orm";

import { AuthButtons } from "@/app/components/auth-buttons";
import { MemberLink } from "@/app/components/member-link";
import { SiteHeader } from "@/app/components/site-header";
import { currentDbUserId } from "@/lib/current-user";
import { db } from "@/lib/db";
import { reviews, submissions, users, votes } from "@/lib/db/schema";
import { deepAssignmentsFor, REVIEW_WEEK } from "@/lib/review-week";

import {
  castVoteAction,
  detectReviewAction,
  fileReviewAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * The review console: your queue over every eligible peer, your pace
 * against the Wed/Fri lines, deep-review flags, and the private ballot,
 * unlocked peer by peer as reviews are filed. No tallies, anywhere.
 */
export default async function ReviewPage() {
  const userId = await currentDbUserId();

  if (!userId) {
    return (
      <div className="min-h-screen">
        <SiteHeader active="review" auth={<AuthButtons />} />
        <main className="mx-auto max-w-sm px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted">
            The review console is per-reviewer — sign in first.
          </p>
          <Link
            href="/signin"
            className="mt-4 inline-block rounded bg-ball px-4 py-2 font-mono text-sm font-bold text-court hover:bg-ball-deep"
          >
            sign in
          </Link>
        </main>
      </div>
    );
  }

  const allSubmissions = await db
    .select({
      id: submissions.id,
      userId: submissions.userId,
      repoUrl: submissions.repoUrl,
      liveUrl: submissions.liveUrl,
      mergedAt: submissions.mergedAt,
      name: users.name,
      githubLogin: users.githubLogin,
    })
    .from(submissions)
    .leftJoin(users, eq(submissions.userId, users.id));

  const eligible = allSubmissions.filter(
    (s) => s.mergedAt && s.userId !== userId
  );
  const excluded = allSubmissions.filter(
    (s) => !s.mergedAt && s.userId !== userId
  );

  const myReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.reviewerId, userId));
  const myVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.voterId, userId));

  const reviewFor = (sid: number) =>
    myReviews.find((r) => r.submissionId === sid);
  const voteFor = (sid: number) => myVotes.find((v) => v.submissionId === sid);

  const deepSet = deepAssignmentsFor(
    userId,
    eligible.map((s) => s.id)
  );

  const filed = eligible.filter((s) => reviewFor(s.id)).length;
  const voted = eligible.filter((s) => voteFor(s.id)).length;
  const required = eligible.length;
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });

  return (
    <div className="min-h-screen">
      <SiteHeader active="review" auth={<AuthButtons />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
          Review week
        </h1>
        <p className="mt-1 font-mono text-xs text-muted">
          review every peer, then vote. a review is a GitHub issue titled{" "}
          <code className="text-ink">Review by @your-handle</code> on the
          peer&apos;s repo — write it there first, then record it here:{" "}
          <span className="text-ink">detect from GitHub</span> finds your
          issue on their repo automatically, or paste its URL if detection
          can&apos;t (rate limit, unusual title). the official vote is a
          public <code className="text-ink">Vote: up</code> line kept in that
          issue — the ballot below is your private tracker, and it syncs
          itself when your filed issue carries the line.
        </p>

        {/* Pace panel */}
        <section className="mt-6 rounded border border-line bg-panel p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="font-display text-3xl font-extrabold text-ball">
                {filed}
              </span>
              <span className="font-display text-xl text-muted">
                /{required}
              </span>
              <span className="ml-2 font-mono text-xs text-muted">
                reviews filed
              </span>
            </div>
            <div className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-panel-2">
              <div
                className="h-full rounded-full bg-ball transition-all"
                style={{
                  width: `${required ? Math.round((filed / required) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px]">
            <span className={filed >= required ? "text-posted" : "text-muted"}>
              {filed >= required ? "✓" : "•"} {required} reviews by{" "}
              {fmt(REVIEW_WEEK.reviewsAndVotesClose)}
            </span>
            <span className={voted >= required ? "text-posted" : "text-muted"}>
              {voted >= required ? "✓" : "•"} {required} votes by the same
              close
            </span>
            <span className="text-faint">
              submissions merge by {fmt(REVIEW_WEEK.submissionMergeDeadline)}
            </span>
          </div>
        </section>

        {/* The queue */}
        <ul className="mt-6 space-y-3">
          {eligible.map((s) => {
            const review = reviewFor(s.id);
            const vote = voteFor(s.id);
            const isDeep = deepSet.has(s.id);
            const file = fileReviewAction.bind(null, s.id);
            const detect = detectReviewAction.bind(null, s.id);
            const cast = castVoteAction.bind(null, s.id);

            return (
              <li
                key={s.id}
                className="rounded border border-line bg-panel p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-base font-bold text-ink">
                      <MemberLink id={s.userId} name={s.name} />
                    </span>
                    {isDeep && (
                      <span
                        className="rounded border border-ball/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ball"
                        title="One of your three assigned deep reviews: 300+ words, full rubric"
                      >
                        deep review
                      </span>
                    )}
                    {review && (
                      <span className="font-mono text-[11px] text-posted">
                        ✓ filed
                      </span>
                    )}
                  </div>
                  <span className="flex gap-4 font-mono text-[11px]">
                    <a
                      href={s.repoUrl}
                      className="text-muted hover:text-ink"
                      target="_blank"
                      rel="noreferrer"
                    >
                      repo ↗
                    </a>
                    {s.liveUrl && (
                      <a
                        href={s.liveUrl}
                        className="text-muted hover:text-ink"
                        target="_blank"
                        rel="noreferrer"
                      >
                        live ↗
                      </a>
                    )}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                  {/* Review leg */}
                  <div>
                    {review ? (
                      <p className="font-mono text-xs text-muted">
                        your review:{" "}
                        <a
                          href={review.issueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ball hover:underline"
                        >
                          {review.issueUrl.replace("https://github.com/", "")}
                        </a>
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={file} className="flex flex-1 flex-wrap gap-2">
                          <input
                            name="issueUrl"
                            required
                            placeholder={`paste your "Review by @" issue URL from their repo`}
                            className="min-w-72 flex-1 rounded border border-line bg-panel-2 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint focus:border-ball focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="rounded bg-ball px-3 py-2 font-mono text-xs font-bold text-court hover:bg-ball-deep"
                          >
                            file review
                          </button>
                        </form>
                        <form action={detect}>
                          <button
                            type="submit"
                            title="Scan their repo for an issue titled Review by @you"
                            className="rounded border border-line px-3 py-2 font-mono text-xs text-muted hover:border-ball hover:text-ink"
                          >
                            detect from GitHub
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Ballot leg: locked until the review is filed */}
                  <div className="flex items-center gap-2">
                    {review ? (
                      <>
                        <form action={cast}>
                          <input type="hidden" name="thumbs" value="up" />
                          <button
                            type="submit"
                            className={`rounded border px-3 py-2 font-mono text-sm transition-colors ${
                              vote?.thumbsUp === true
                                ? "border-ball bg-ball/15 text-ball"
                                : "border-line text-muted hover:border-ball hover:text-ink"
                            }`}
                            title="tracks your official Vote: up — the vote of record is the line in your review issue"
                          >
                            👍
                          </button>
                        </form>
                        <form action={cast}>
                          <input type="hidden" name="thumbs" value="down" />
                          <button
                            type="submit"
                            className={`rounded border px-3 py-2 font-mono text-sm transition-colors ${
                              vote?.thumbsUp === false
                                ? "border-amber bg-amber/15 text-amber"
                                : "border-line text-muted hover:border-amber hover:text-ink"
                            }`}
                            title="private note to self — the program has no downvote; leaving Vote: up out of your issue is the official abstain"
                          >
                            👎
                          </button>
                        </form>
                        <span className="font-mono text-[10px] text-faint">
                          private tracker
                        </span>
                      </>
                    ) : (
                      <span
                        className="font-mono text-[11px] text-faint"
                        title="The vote unlocks when your written review is filed"
                      >
                        🔒 vote locked — file your review
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Excluded strip: honest about who is not on the ballot, and why */}
        {excluded.length > 0 && (
          <section className="mt-6 rounded border border-line-soft bg-court-2 p-4">
            <h2 className="font-mono text-[11px] uppercase tracking-wide text-faint">
              not on the ballot (submission not merged by deadline)
            </h2>
            <ul className="mt-2 space-y-1">
              {excluded.map((s) => (
                <li key={s.id} className="font-mono text-xs text-faint">
                  <MemberLink id={s.userId} name={s.name} /> — may still review
                  and vote; cannot receive votes
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
