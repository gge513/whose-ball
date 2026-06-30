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
      if (data.fallback) setNote("Drafted without the agent (no API key). Edit and post directly.");
    } catch {
      setText(assembledText);
      setEditing(true);
      setNote("Agent unavailable. Your shipped list is ready to post.");
    } finally {
      setDrafting(false);
    }
  }

  function post() {
    startTransition(async () => {
      const r = await postUpdateAction(week, text);
      if (!r.ok) {
        setNote("Sign in to post your update.");
        return;
      }
      setPosted(true);
      setEditing(false);
      if (!r.configured) setNote("Posted for this session (add Upstash to persist).");
    });
  }

  return (
    <div className="mt-4 rounded-md border border-neutral-700 bg-neutral-900/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="rounded bg-white px-1.5 py-0.5 font-medium text-black">
          your ball
        </span>
        {posted ? (
          <span className="text-emerald-400">posted</span>
        ) : (
          <span className="text-neutral-400">
            {quiet ? "nothing to report yet" : "not posted yet"}
          </span>
        )}
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full resize-y rounded border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
      ) : (
        <p className="text-sm text-neutral-300">
          {text || "No merged PRs this week."}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!editing && !quiet && (
          <button
            onClick={passToAgent}
            disabled={drafting}
            className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            {drafting ? "drafting..." : posted ? "redraft with agent" : "pass to agent"}
          </button>
        )}
        {!editing && !quiet && (
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
          >
            edit
          </button>
        )}
        {editing && (
          <button
            onClick={post}
            disabled={isPending}
            className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? "posting..." : "approve and post"}
          </button>
        )}
        {posted && !editing && (
          <span className="text-xs text-neutral-600">editable until Friday</span>
        )}
      </div>

      {note && <p className="mt-2 text-xs text-amber-400/80">{note}</p>}
    </div>
  );
}
