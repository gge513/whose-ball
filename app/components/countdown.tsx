"use client";

import { useEffect, useState } from "react";

function remaining(msLeft: number): string {
  const s = Math.floor(msLeft / 1000);
  if (s <= 0) return "closed";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s % 60}s`;
  return `${m}m ${s % 60}s`;
}

/**
 * Live countdown to a deadline. The server renders a real value from its
 * own clock (no placeholder flash); the client takes over on mount and
 * ticks every second. Goes amber inside the final 24 hours.
 */
export function Countdown({
  deadline,
  serverNow,
}: {
  deadline: number;
  serverNow: number;
}) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    // No immediate tick: the server value is milliseconds stale at worst,
    // and the interval corrects any real clock skew within a second.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = deadline - now;
  const urgent = msLeft > 0 && msLeft < 24 * 60 * 60 * 1000;

  return (
    <span
      suppressHydrationWarning
      className={`tabular-nums ${
        msLeft <= 0 ? "text-faint" : urgent ? "text-amber" : "text-ink"
      }`}
    >
      {remaining(msLeft)}
    </span>
  );
}
