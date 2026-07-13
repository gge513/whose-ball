import Link from "next/link";

import { AuthButtons } from "@/app/components/auth-buttons";
import { SiteHeader } from "@/app/components/site-header";
import { feedLine, loadFeed, loadMomentumTiles } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * The momentum page: the cohort's collective motion, one glance.
 * Two ideas, deliberately absent: per-person counts and any ordering of
 * people. Movement is public; comparison does not exist here.
 */

function ago(d: Date): string {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

const KIND_COLOR: Record<string, string> = {
  task_done: "text-ball",
  stage_advanced: "text-ball",
  submission_merged: "text-ball",
  review_filed: "text-ink",
  project_created: "text-ink",
  blocker_raised: "text-amber",
  blocker_cleared: "text-ball",
};

export default async function MomentumPage() {
  const [tiles, feed] = await Promise.all([loadMomentumTiles(), loadFeed(50)]);

  const tileDefs = [
    { label: "projects live", value: tiles.projectsLive, href: "/projects" },
    { label: "shipped", value: tiles.shipped, href: "/projects" },
    {
      label: "tasks done this week",
      value: tiles.tasksDoneThisWeek,
      href: "/tasks?status=done",
    },
    { label: "reviews filed", value: tiles.reviewsFiled, href: "/review" },
    {
      label: "asking for help",
      value: tiles.openHelpRequests,
      href: "/tasks?status=blocked",
      warm: true,
    },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader active="momentum" auth={<AuthButtons />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
          Momentum
        </h1>
        <p className="mt-1 font-mono text-[11px] text-faint">
          what the cohort is shipping · nobody is ranked here
        </p>

        {/* Collective tiles: totals only, every one a door into the work */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tileDefs.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`rounded border bg-panel p-4 transition-colors ${
                t.warm && t.value > 0
                  ? "border-amber/40 hover:border-amber"
                  : "border-line-soft hover:border-line"
              }`}
            >
              <span
                className={`block font-display text-3xl font-extrabold ${
                  t.warm && t.value > 0 ? "text-amber" : "text-ink"
                }`}
              >
                {t.value}
              </span>
              <span className="mt-1 block font-mono text-[11px] uppercase tracking-wide text-muted">
                {t.label}
              </span>
            </Link>
          ))}
        </section>

        {/* The shipping feed: real events, newest first */}
        <section className="mt-10">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            shipping feed
          </h2>
          {feed.length === 0 ? (
            <p className="mt-2 font-mono text-sm text-faint">
              Quiet so far. The first shipped task starts the feed.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line-soft rounded border border-line bg-panel">
              {feed.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline gap-3 px-4 py-2.5"
                >
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      KIND_COLOR[item.kind] ?? "text-ink"
                    }`}
                  >
                    ●
                  </span>
                  <span className="flex-1 font-mono text-sm text-ink">
                    <span className="font-bold">{item.actorName}</span>{" "}
                    <span className="text-muted">{feedLine(item)}</span>
                    {item.projectId &&
                      item.kind !== "project_created" &&
                      item.kind !== "stage_advanced" && (
                        <Link
                          href={`/projects/${item.projectId}`}
                          className="text-faint hover:text-ball"
                        >
                          {" "}
                          in {item.projectName}
                        </Link>
                      )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-faint">
                    {ago(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
