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
      setNote("sign in to vote");
      return;
    }
    setNote(null);
    startTransition(async () => {
      const r = await toggleVoteAction(submissionId);
      if (!r.ok) {
        setNote("sign in to vote");
        return;
      }
      setCount(r.count);
      setVoted(r.voted);
      if (!r.configured) setNote("not persisted");
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={vote}
        disabled={isPending}
        aria-pressed={voted}
        className={`flex w-16 flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition disabled:opacity-50 ${
          voted
            ? "border-ball bg-ball/10 text-ball shadow-[0_0_16px_-2px_rgba(200,245,34,0.45)]"
            : "border-line text-muted hover:border-ball/60 hover:text-ink"
        }`}
      >
        <span aria-hidden className="text-sm leading-none">
          {voted ? "▲" : "△"}
        </span>
        <span className="font-mono text-base font-bold tabular-nums leading-none">
          {count}
        </span>
      </button>
      {note && (
        <span className="font-mono text-[0.65rem] text-amber">{note}</span>
      )}
    </div>
  );
}
