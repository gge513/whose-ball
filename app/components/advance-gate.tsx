"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The stage controls with a voice. Advancing is a two-tap — the first
 * press arms the button with where you're headed, the second commits —
 * because every advance is a public feed line and three careless clicks
 * once walked a project define→verify (tune-list #6). The reverse gear
 * is the matching correction: one station back, silent, same two-tap.
 *
 * When the Define gate is closed the advance becomes the referee: the
 * press gets a courtside call AND the contract itself — the three
 * questions, answered/blank — right at the button, not a scroll away
 * (tune-list #5).
 *
 * The server actions stay the real gate. This component is commentary;
 * the law lives in advanceStageAction / retreatStageAction.
 */

const CALLS = [
  (n: number) =>
    `whistle! you can't leave define with the story untold. ${n} question${n === 1 ? "" : "s"} still blank.`,
  () => `still whistled. the three answers ARE the door.`,
  () => `no secret handshake. answer them below, then come back.`,
  () => `respect the persistence. the questions have not moved.`,
];

const ARM_MS = 4000;

export function AdvanceGate({
  advance,
  retreat,
  locked,
  questions,
  nextStage,
  prevStage,
}: {
  advance: () => Promise<void>;
  retreat: (() => Promise<void>) | null;
  locked: boolean;
  questions: { label: string; answered: boolean }[];
  nextStage: string | null;
  prevStage: string | null;
}) {
  const [armed, setArmed] = useState<"advance" | "retreat" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [call, setCall] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
      if (callTimer.current) clearTimeout(callTimer.current);
    };
  }, []);

  const arm = (which: "advance" | "retreat") => {
    setArmed(which);
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    disarmTimer.current = setTimeout(() => setArmed(null), ARM_MS);
  };

  const missing = questions.filter((q) => !q.answered).length;

  const blowWhistle = () => {
    const n = attempt + 1;
    setAttempt(n);
    setCall(CALLS[Math.min(n - 1, CALLS.length - 1)](missing));
    setShaking(true);
    setTimeout(() => setShaking(false), 450);

    // The contract flashes where it lives too, for whoever's scrolled there
    const panel = document.getElementById("define-panel");
    if (panel) {
      panel.classList.remove("gate-flash");
      void panel.offsetWidth; // restart the animation even on rapid re-whistles
      panel.classList.add("gate-flash");
    }

    if (callTimer.current) clearTimeout(callTimer.current);
    callTimer.current = setTimeout(() => setCall(null), 8000);
  };

  return (
    <span className="relative ml-2 inline-flex items-center gap-1.5">
      {retreat && prevStage && (
        <form action={retreat}>
          <button
            type="submit"
            title={`back to ${prevStage}`}
            onClick={(e) => {
              if (armed !== "retreat") {
                e.preventDefault();
                arm("retreat");
              }
            }}
            className={`rounded border px-2 py-1 font-mono text-[11px] transition-colors ${
              armed === "retreat"
                ? "border-amber text-amber"
                : "border-line text-faint hover:border-amber hover:text-amber"
            }`}
          >
            {armed === "retreat" ? `back to ${prevStage}? press again` : "← back"}
          </button>
        </form>
      )}

      {nextStage &&
        (locked ? (
          <button
            type="button"
            onClick={blowWhistle}
            aria-describedby={call ? "gate-call" : undefined}
            className={`rounded border border-line px-2 py-1 font-mono text-[11px] text-faint transition-colors hover:border-amber hover:text-amber ${
              shaking ? "gate-shake" : ""
            }`}
          >
            advance → <span className="text-amber">· {missing} to answer</span>
          </button>
        ) : (
          <form action={advance}>
            <button
              type="submit"
              title={`advance to ${nextStage}`}
              onClick={(e) => {
                if (armed !== "advance") {
                  e.preventDefault();
                  arm("advance");
                }
              }}
              className={`rounded border px-2 py-1 font-mono text-[11px] transition-colors ${
                armed === "advance"
                  ? "border-ball text-ball"
                  : "border-line text-muted hover:border-ball hover:text-ink"
              }`}
            >
              {armed === "advance"
                ? `advance to ${nextStage}? press again`
                : "advance →"}
            </button>
          </form>
        ))}

      {/* The refusal, at the button: the courtside call plus the contract
          itself — which of the three answers the door still wants. */}
      {call && (
        <div
          id="gate-call"
          role="status"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded border border-amber/50 bg-panel p-3 text-left shadow-xl"
        >
          <p className="font-mono text-xs text-amber">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber align-middle" />
            {call}
          </p>
          <ul className="mt-2 space-y-1 normal-case tracking-normal">
            {questions.map((q) => (
              <li
                key={q.label}
                className={`font-mono text-[11px] ${
                  q.answered ? "text-posted line-through" : "text-ink"
                }`}
              >
                {q.answered ? "✓" : "○"} {q.label}
              </li>
            ))}
          </ul>
          <a
            href="#define-panel"
            onClick={() => setCall(null)}
            className="mt-2 inline-block font-mono text-[11px] normal-case tracking-normal text-muted hover:text-ball"
          >
            answer them below ↓
          </a>
        </div>
      )}
    </span>
  );
}
