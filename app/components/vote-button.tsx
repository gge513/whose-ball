"use client";

import { useState, useTransition } from "react";
import { toggleVoteAction } from "@/app/actions";

/**
 * Approval-vote toggle. The count shown always comes from committed server
 * state (the returned SCARD), never an optimistic guess, so it cannot drift on
 * a failed write (spec-flow MUST: vote integrity).
 */
export function VoteButton({
  submissionId,
  initialCount,
  initialVoted,
  signedIn,
}: {
  submissionId: string;
  initialCount: number;
  initialVoted: boolean;
  signedIn: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function vote() {
    if (!signedIn) {
      setNote("Sign in to vote");
      return;
    }
    setNote(null);
    startTransition(async () => {
      const r = await toggleVoteAction(submissionId);
      if (!r.ok) {
        setNote("Sign in to vote");
        return;
      }
      setCount(r.count);
      setVoted(r.voted);
      if (!r.configured) setNote("not persisted (add Upstash)");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={vote}
        disabled={isPending}
        aria-pressed={voted}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
          voted
            ? "border-emerald-600 bg-emerald-950 text-emerald-300"
            : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
        }`}
      >
        <span aria-hidden>{voted ? "▲" : "△"}</span>
        <span className="tabular-nums">{count}</span>
      </button>
      {note && <span className="text-xs text-amber-400/80">{note}</span>}
    </div>
  );
}
