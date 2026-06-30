import { AuthButtons } from "@/app/components/auth-buttons";
import { loadCohort } from "@/lib/cohort";
import { ingestCohort, type MemberActivity } from "@/lib/github";
import { assembleUpdate, type AssembledUpdate } from "@/lib/assemble";
import { getWeekWindow } from "@/lib/week";

export const dynamic = "force-dynamic";

type Search = Promise<{ week?: string | string[] }>;

function ballState(activity: MemberActivity, update: AssembledUpdate) {
  if (activity.error) {
    return { label: "couldn't load", cls: "bg-amber-950 text-amber-300" };
  }
  if (update.quiet) {
    return { label: "quiet week", cls: "bg-neutral-800 text-neutral-400" };
  }
  return {
    label: `shipped ${update.count}`,
    cls: "bg-emerald-950 text-emerald-300",
  };
}

export default async function Heartbeat({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const weekParam = Array.isArray(params.week) ? params.week[0] : params.week;
  const window = getWeekWindow(weekParam);

  const members = await loadCohort();
  const activity = await ingestCohort(members, window);
  const rows = activity.map((a) => ({ a, u: assembleUpdate(a.prs) }));

  const shipped = rows.filter((r) => !r.a.error && !r.u.quiet).length;
  const quiet = rows.filter((r) => !r.a.error && r.u.quiet).length;
  const failed = rows.filter((r) => r.a.error).length;

  const syncedAt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">
            Whose Ball
          </span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
            shipping heartbeat
          </span>
        </div>
        <AuthButtons />
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Who shipped this week
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              {window.label}{" "}
              <span className="text-neutral-600">
                ({window.timezone}, by merge time)
              </span>{" "}
              <span className="text-neutral-600">- as of {syncedAt}</span>
            </p>
          </div>
          <div className="text-sm text-neutral-400">
            <span className="text-emerald-400">{shipped} shipped</span>
            {" / "}
            <span className="text-neutral-400">{quiet} quiet</span>
            {failed > 0 && (
              <>
                {" / "}
                <span className="text-amber-400">{failed} unavailable</span>
              </>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-neutral-800 p-8 text-center text-neutral-500">
            No cohort members configured yet. Add handles to{" "}
            <code className="text-neutral-300">data/cohort.json</code>.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.map(({ a, u }) => {
              const state = ballState(a, u);
              return (
                <li
                  key={a.handle}
                  className="rounded-lg border border-neutral-800 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://github.com/${a.handle}.png?size=64`}
                        alt={a.handle}
                        className="h-9 w-9 rounded-full bg-neutral-800"
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {a.name ?? a.handle}
                        </div>
                        <a
                          href={`https://github.com/${a.handle}`}
                          className="text-xs text-neutral-500 hover:text-neutral-300"
                        >
                          @{a.handle}
                        </a>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${state.cls}`}
                    >
                      {state.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    {a.error ? (
                      <p className="text-sm text-amber-400/80">{a.error}</p>
                    ) : u.quiet ? (
                      <p className="text-sm text-neutral-500">
                        No merged PRs this week. Nothing to report.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {u.byRepo.flatMap((g) =>
                          g.prs.slice(0, 8).map((pr) => (
                            <li key={pr.url} className="text-sm">
                              <a
                                href={pr.url}
                                className="text-neutral-200 underline-offset-2 hover:underline"
                              >
                                {pr.title}
                              </a>{" "}
                              <span className="text-neutral-600">
                                {pr.repo}
                              </span>
                            </li>
                          )),
                        )}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8 text-xs text-neutral-600">
          Every shipped item links to its merged PR. Public repos only, so the
          links always resolve. Posting and the agent draft land in Phase 2; the
          voting console in Phase 3.
        </p>
      </div>
    </main>
  );
}
