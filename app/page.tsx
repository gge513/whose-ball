import { AuthButtons } from "@/app/components/auth-buttons";
import { MyUpdate } from "@/app/components/my-update";
import { getSession } from "@/auth";
import { loadCohort } from "@/lib/cohort";
import { ingestCohort, type MemberActivity } from "@/lib/github";
import { assembleUpdate, type AssembledUpdate } from "@/lib/assemble";
import { getUpdate } from "@/lib/redis";
import { getWeekWindow } from "@/lib/week";
import { SiteHeader } from "@/app/components/site-header";

export const dynamic = "force-dynamic";

type Search = Promise<{ week?: string | string[] }>;

function ballState(
  activity: MemberActivity,
  update: AssembledUpdate,
  posted: boolean,
) {
  if (activity.error) {
    return {
      label: "load error",
      cls: "border-amber/30 bg-amber/10 text-amber",
      live: false,
    };
  }
  if (posted) {
    return {
      label: "posted",
      cls: "border-posted/30 bg-posted/10 text-posted",
      live: false,
    };
  }
  if (update.quiet) {
    return {
      label: "quiet",
      cls: "border-line-soft text-faint",
      live: false,
    };
  }
  return {
    label: `shipped ${update.count}`,
    cls: "border-ball/40 bg-ball/10 text-ball",
    live: true,
  };
}

function ShippedList({ activity }: { activity: MemberActivity }) {
  return (
    <ul className="space-y-1.5">
      {activity.prs.slice(0, 8).map((pr) => (
        <li key={pr.url} className="flex gap-2 text-sm">
          <span className="select-none text-ball/50">→</span>
          <span>
            <a
              href={pr.url}
              className="text-ink/90 underline-offset-2 hover:text-ball hover:underline"
            >
              {pr.title}
            </a>{" "}
            <span className="font-mono text-xs text-faint">{pr.repo}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-display text-xl font-bold tabular-nums ${tone}`}>
        {n}
      </span>
      <span className="kicker text-faint">{label}</span>
    </div>
  );
}

export default async function Heartbeat({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const weekParam = Array.isArray(params.week) ? params.week[0] : params.week;
  const window = getWeekWindow(weekParam);
  const weekKey = window.startDate;

  const session = await getSession();
  const me = session?.user?.login ?? null;

  const members = await loadCohort();
  const activity = await ingestCohort(members, window);
  const postedUpdates = await Promise.all(
    activity.map((a) => getUpdate(a.handle, weekKey)),
  );

  const rows = activity.map((a, i) => ({
    a,
    u: assembleUpdate(a.prs),
    postedText: postedUpdates[i]?.approved ?? null,
  }));

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
    <main className="min-h-screen">
      <SiteHeader active="heartbeat" auth={<AuthButtons />} />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-6">
          <div>
            <p className="kicker mb-2 text-ball">/ shipping heartbeat</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Who shipped this week
            </h1>
            <p className="mt-2 font-mono text-xs text-muted">
              {window.label}
              <span className="text-faint">
                {" "}
                · {window.timezone}, by merge time · as of {syncedAt}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-5 rounded-lg border border-line-soft bg-panel/60 px-5 py-3">
            <Stat n={shipped} label="live" tone="text-ball" />
            <Stat n={quiet} label="quiet" tone="text-muted" />
            <Stat n={failed} label="err" tone="text-amber" />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-line p-8 text-center text-muted">
            No cohort members configured yet. Add handles to{" "}
            <code className="font-mono text-ball">data/cohort.json</code>.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.map(({ a, u, postedText }, i) => {
              const isMe = me !== null && a.handle === me;
              const state = ballState(a, u, Boolean(postedText));
              return (
                <li
                  key={a.handle}
                  className={`card reveal rounded-xl border bg-panel/50 p-5 ${
                    isMe ? "border-ball/40" : "border-line-soft"
                  }`}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://github.com/${a.handle}.png?size=64`}
                        alt={a.handle}
                        className="h-10 w-10 rounded-full bg-panel-2 ring-1 ring-line"
                      />
                      <div>
                        <div className="font-display text-sm font-semibold text-ink">
                          {a.name ?? a.handle}
                          {isMe && (
                            <span className="ml-2 font-mono text-[0.65rem] text-ball">
                              you
                            </span>
                          )}
                        </div>
                        <a
                          href={`https://github.com/${a.handle}`}
                          className="font-mono text-xs text-faint hover:text-muted"
                        >
                          @{a.handle}
                        </a>
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.7rem] font-medium ${state.cls}`}
                    >
                      {state.live && (
                        <span className="h-1.5 w-1.5 rounded-full bg-ball shadow-[0_0_6px_1px_rgba(200,245,34,0.7)]" />
                      )}
                      {state.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    {a.error ? (
                      <p className="font-mono text-sm text-amber/80">
                        {a.error}
                      </p>
                    ) : isMe ? (
                      <MyUpdate
                        week={weekKey}
                        assembledText={u.text}
                        prs={a.prs.map((p) => ({
                          title: p.title,
                          repo: p.repo,
                          url: p.url,
                        }))}
                        postedText={postedText}
                        quiet={u.quiet}
                      />
                    ) : postedText ? (
                      <div>
                        <p className="text-sm leading-relaxed text-ink/90">
                          {postedText}
                        </p>
                        {!u.quiet && (
                          <div className="mt-3 border-t border-line-soft pt-3">
                            <ShippedList activity={a} />
                          </div>
                        )}
                      </div>
                    ) : u.quiet ? (
                      <p className="text-sm text-faint">
                        No merged PRs this week. Nothing to report.
                      </p>
                    ) : (
                      <ShippedList activity={a} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-10 font-mono text-xs text-faint">
          Every shipped item links to its merged PR. Public repos only, so the
          links always resolve. Sign in to pass your own update to the agent and
          post it.
        </p>
      </div>
    </main>
  );
}
