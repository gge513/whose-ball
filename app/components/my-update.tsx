"use client";

import { useState, useTransition } from "react";
import { postUpdateAction } from "@/app/actions";

type PR = { title: string; repo: string; url: string };

/**
 * The signed-in user's own card: the whose-ball propose-approve loop.
 * Pass the ball to the agent (drafts from your real PRs), review/edit, then
 * post. With no LLM the deterministic text is still editable and postable, so
 * the ball always reaches "posted" (plan: LLM is additive, never a blocker).
 */
export function MyUpdate({
  week,
  assembledText,
  prs,
  postedText,
  quiet,
}: {
  week: string;
  assembledText: string;
  prs: PR[];
  postedText: string | null;
  quiet: boolean;
}) {
  const [text, setText] = useState(postedText ?? assembledText);
  const [editing, setEditing] = useState(false);
  const [posted, setPosted] = useState(Boolean(postedText));
  const [drafting, setDrafting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function passToAgent() {
    setDrafting(true);
    setNote(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prs }),
      });
      const data = (await res.json()) as { text: string; fallback?: boolean };
      setText(data.text);
      setEditing(true);
      if (data.fallback)
        setNote("drafted without the agent (no API key). edit and post.");
    } catch {
      setText(assembledText);
      setEditing(true);
      setNote("agent unavailable. your shipped list is ready to post.");
    } finally {
      setDrafting(false);
    }
  }

  function post() {
    startTransition(async () => {
      const r = await postUpdateAction(week, text);
      if (!r.ok) {
        setNote("sign in to post your update.");
        return;
      }
      setPosted(true);
      setEditing(false);
      if (!r.configured) setNote("posted for this session (add Upstash to persist).");
    });
  }

  const btn =
    "rounded-md px-3 py-1.5 font-mono text-xs transition disabled:opacity-50";

  return (
    <div className="mt-4 rounded-lg border border-ball/30 bg-court-2 p-3.5 shadow-[inset_0_0_24px_-12px_rgba(200,245,34,0.25)]">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={posted ? "h-2.5 w-2.5 rounded-full bg-posted" : "ball-dot"} />
        <span className="kicker text-ball">your ball</span>
        <span className="font-mono text-[0.7rem] text-muted">
          {posted
            ? "posted, editable until Friday"
            : quiet
              ? "nothing to report yet"
              : "on you until you post it"}
        </span>
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          className="w-full resize-y rounded-md border border-line bg-court p-2.5 font-mono text-sm text-ink outline-none transition-colors focus:border-ball"
        />
      ) : (
        <p className="text-sm leading-relaxed text-ink/90">
          {text || "No merged PRs this week."}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!editing && !quiet && (
          <button
            onClick={passToAgent}
            disabled={drafting}
            className={`${btn} border border-line text-ink hover:border-ball/60`}
          >
            {drafting
              ? "drafting..."
              : posted
                ? "redraft with agent"
                : "pass to agent"}
          </button>
        )}
        {!editing && !quiet && (
          <button
            onClick={() => setEditing(true)}
            className={`${btn} border border-line-soft text-muted hover:text-ink`}
          >
            edit
          </button>
        )}
        {editing && (
          <button
            onClick={post}
            disabled={isPending}
            className={`${btn} bg-ball font-semibold text-court hover:bg-ball-deep`}
          >
            {isPending ? "posting..." : "approve and post"}
          </button>
        )}
      </div>

      {note && (
        <p className="mt-2 font-mono text-[0.7rem] text-amber">{note}</p>
      )}
    </div>
  );
}
