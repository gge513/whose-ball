import Link from "next/link";
import { AuthButtons } from "@/app/components/auth-buttons";
import { VoteButton } from "@/app/components/vote-button";
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
    { label: "Loom", href: s.loomUrl },
  ];
  const present = links.filter((l) => l.href);
  if (present.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
      {present.map((l) => (
        <a
          key={l.label}
          href={l.href}
          className="text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline"
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
  // Most votes first.
  withVotes.sort((a, b) => b.v.count - a.v.count);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">
            Whose Ball
          </span>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-neutral-500 hover:text-neutral-200">
              Heartbeat
            </Link>
            <span className="text-neutral-300">Vote</span>
          </nav>
        </div>
        <AuthButtons />
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Friday voting
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Upvote any, all, or none. One vote per builder per entry. Most votes
            wins the week.
            {!signedIn && (
              <span className="text-neutral-600"> Sign in to vote.</span>
            )}
          </p>
        </div>

        {withVotes.length === 0 ? (
          <p className="rounded-lg border border-neutral-800 p-8 text-center text-neutral-500">
            No trying-to-win submissions yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {withVotes.map(({ s, v }) => (
              <li
                key={s.githubHandle}
                className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 p-5"
              >
                <div className="flex items-start gap-3">
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.photoUrl}
                      alt={s.githubHandle}
                      className="h-10 w-10 rounded-full bg-neutral-800"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-xs text-neutral-300">
                      {initials(s)}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {s.name ?? s.githubHandle}
                    </div>
                    <div className="text-xs text-neutral-500">
                      @{s.githubHandle}
                    </div>
                    <p className="mt-2 text-sm text-neutral-300">
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
            ))}
          </ul>
        )}

        <p className="mt-8 text-xs text-neutral-600">
          Reads the cohort&apos;s submission entries. Built to run this
          week&apos;s vote.
        </p>
      </div>
    </main>
  );
}
