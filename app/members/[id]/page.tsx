import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray, sql } from "drizzle-orm";

import { AuthButtons } from "@/app/components/auth-buttons";
import { SiteHeader } from "@/app/components/site-header";
import { db } from "@/lib/db";
import { events, projects, users } from "@/lib/db/schema";
import { chapterTitle, loadNarrative } from "@/lib/narrative";

export const dynamic = "force-dynamic";

/**
 * A member's page (ratified: assists + conversions, never task counts).
 * The save is the scored act — this page makes the quiet unblocking work
 * visible where organizations normally make it invisible. The weekly
 * narrative will land here too.
 */
export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId)) notFound();

  const member = await db.query.users.findFirst({
    where: eq(users.id, memberId),
  });
  if (!member) notFound();

  const narrative = await loadNarrative(member);

  const [counts] = await db
    .select({
      assists: sql<number>`count(*) filter (where ${events.kind} = 'assist')::int`,
      conversions: sql<number>`count(*) filter (where ${events.kind} = 'assist_converted')::int`,
    })
    .from(events)
    .where(eq(events.actorId, memberId));

  const assistHistory = await db
    .select({
      id: events.id,
      kind: events.kind,
      detail: events.detail,
      projectId: events.projectId,
      projectName: projects.name,
      createdAt: events.createdAt,
    })
    .from(events)
    .leftJoin(projects, eq(events.projectId, projects.id))
    .where(
      sql`${events.actorId} = ${memberId} and ${inArray(events.kind, ["assist", "assist_converted"])}`
    )
    .orderBy(desc(events.createdAt), desc(events.id))
    .limit(20);

  return (
    <div className="min-h-screen">
      <SiteHeader auth={<AuthButtons />} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center gap-4">
          {member.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-full border border-line"
            />
          )}
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">
              {member.name}
            </h1>
            {member.githubLogin && (
              <p className="font-mono text-[11px] text-faint">
                @{member.githubLogin}
              </p>
            )}
          </div>
        </div>

        {/* Assists: the one stat a member page carries. Deliberately absent:
            task counts, review counts, any rankable number. */}
        <section className="mt-8 grid max-w-md grid-cols-2 gap-3">
          <div className="rounded border border-line-soft bg-panel p-4">
            <span className="block font-display text-3xl font-extrabold text-posted">
              {counts.assists}
            </span>
            <span className="mt-1 block font-mono text-[11px] uppercase tracking-wide text-muted">
              assists
            </span>
            <span className="mt-1 block font-mono text-[10px] text-faint">
              blockers cleared that named them
            </span>
          </div>
          <div className="rounded border border-line-soft bg-panel p-4">
            <span className="block font-display text-3xl font-extrabold text-ball">
              {counts.conversions}
            </span>
            <span className="mt-1 block font-mono text-[11px] uppercase tracking-wide text-muted">
              converted
            </span>
            <span className="mt-1 block font-mono text-[10px] text-faint">
              the unblocked task went on to ship
            </span>
          </div>
        </section>

        {/* The weekly narrative (ratified): a composed match report per
            chapter — own motion, then the connective tissue, then one
            cohort clause. Third person for every reader (provisional). */}
        <section className="mt-10">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            the season
          </h2>
          <div className="mt-3 space-y-4">
            {narrative.map((r) => (
              <article
                key={r.chapter.index}
                className="rounded border border-line-soft bg-panel p-5"
              >
                <h3 className="font-mono text-[11px] uppercase tracking-wide text-faint">
                  {chapterTitle(r.chapter)}
                  {r.chapter.ongoing && (
                    <span className="text-amber"> · in progress</span>
                  )}
                </h3>
                <p className="mt-2 font-display text-base leading-relaxed text-ink">
                  {r.paragraph}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            assist history
          </h2>
          {assistHistory.length === 0 ? (
            <p className="mt-2 font-mono text-sm text-faint">
              No assists yet. Get named on a blocker, clear the way.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line-soft rounded border border-line bg-panel">
              {assistHistory.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      e.kind === "assist_converted" ? "text-ball" : "text-posted"
                    }`}
                  >
                    ●
                  </span>
                  <span className="flex-1 font-mono text-sm text-muted">
                    {e.kind === "assist_converted"
                      ? `assist converted — "${e.detail}" shipped`
                      : `assisted on "${e.detail}"`}
                    {e.projectId && (
                      <Link
                        href={`/projects/${e.projectId}`}
                        className="text-faint hover:text-ball"
                      >
                        {" "}
                        in {e.projectName}
                      </Link>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-faint">
                    {e.createdAt.toLocaleDateString()}
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
