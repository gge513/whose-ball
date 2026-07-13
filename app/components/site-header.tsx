import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Scoreboard top bar: the wordmark with the live ball, the two-screen nav,
 * and the auth control.
 */
export function SiteHeader({
  active,
  auth,
}: {
  active: "heartbeat" | "projects" | "tasks" | "me" | "review";
  auth: ReactNode;
}) {
  const tab = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`font-mono text-xs transition-colors ${
        active === key
          ? "text-ink"
          : "text-faint hover:text-muted"
      }`}
    >
      {label}
      {active === key && <span className="ml-1.5 text-ball">●</span>}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-court/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="ball-dot" />
            <span className="font-display text-base font-extrabold uppercase tracking-[0.12em] text-ink">
              Whose Ball
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            {tab("/me", "me", "me")}
            {tab("/projects", "projects", "projects")}
            {tab("/tasks", "tasks", "tasks")}
            {tab("/review", "review", "review")}
            {tab("/", "heartbeat", "heartbeat")}
          </nav>
        </div>
        {auth}
      </div>
    </header>
  );
}
