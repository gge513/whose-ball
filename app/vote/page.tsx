import { AuthButtons } from "@/app/components/auth-buttons";
import { VoteButton } from "@/app/components/vote-button";
import { SiteHeader } from "@/app/components/site-header";
import { getSession } from "@/auth";
import { loadSubmissions, competing, type Submission } from "@/lib/submissions";
import { getVoteState } from "@/lib/redis";

export const dynamic = "force-dynamic";

function initials(s: Submission): string {
  const base = s.name ?? s.githubHandle;
  return base
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Links({ s }: { s: Submission }) {
  const links: { label: string; href?: string }[] = [
    { label: "repo", href: s.repoUrl },
    { label: "live", href: s.liveUrl },
    { label: "loom", href: s.loomUrl },
  ];
  const present = links.filter((l) => l.href);
  if (present.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {present.map((l) => (
        <a
          key={l.label}
          href={l.href}
          className="rounded border border-line-soft px-2 py-0.5 font-mono text-[0.7rem] text-muted transition-colors hover:border-ball/50 hover:text-ink"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

export default async function Vote() {
  const submissions = competing(await loadSubmissions());

  const session = await getSession();
  const voterId = session?.user?.login ?? undefined;
  const signedIn = Boolean(voterId);

  const withVotes = await Promise.all(
    submissions.map(async (s) => ({
      s,
      v: await getVoteState(s.githubHandle, voterId),
    })),
  );
  withVotes.sort((a, b) => b.v.count - a.v.count);

  return (
    <main className="min-h-screen">
      <SiteHeader active="vote" auth={<AuthButtons />} />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 border-b border-line-soft pb-6">
          <p className="kicker mb-2 text-ball">/ Friday voting</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Who runs the cohort next
          </h1>
          <p className="mt-2 font-mono text-xs text-muted">
            Upvote any, all, or none. One vote per builder per entry. Most votes
            wins the week.
            {!signedIn && <span className="text-faint"> Sign in to vote.</span>}
          </p>
        </div>

        {withVotes.length === 0 ? (
          <p className="rounded-lg border border-line p-8 text-center text-muted">
            No trying-to-win submissions yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {withVotes.map(({ s, v }, i) => {
              const leader = i === 0 && v.count > 0;
              return (
                <li
                  key={s.githubHandle}
                  className={`card reveal flex items-start gap-4 rounded-xl border bg-panel/50 p-5 ${
                    leader ? "border-ball/40" : "border-line-soft"
                  }`}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <div className="flex w-7 shrink-0 justify-center pt-1">
                    <span
                      className={`font-display text-lg font-bold tabular-nums ${
                        leader ? "text-ball" : "text-faint"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </div>

                  <div className="flex flex-1 items-start gap-3">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photoUrl}
                        alt={s.githubHandle}
                        className="h-11 w-11 rounded-full bg-panel-2 ring-1 ring-line"
                      />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-panel-2 font-mono text-xs text-muted ring-1 ring-line">
                        {initials(s)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="font-display text-sm font-semibold text-ink">
                        {s.name ?? s.githubHandle}
                      </div>
                      <div className="font-mono text-xs text-faint">
                        @{s.githubHandle}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink/90">
                        {s.pitch ?? s.repoUrl ?? "No pitch provided."}
                      </p>
                      <Links s={s} />
                    </div>
                  </div>

                  <VoteButton
                    submissionId={s.githubHandle}
                    initialCount={v.count}
                    initialVoted={v.voted}
                    signedIn={signedIn}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-10 font-mono text-xs text-faint">
          Reads the cohort&apos;s submission entries. Built to run this
          week&apos;s vote.
        </p>
      </div>
    </main>
  );
}
