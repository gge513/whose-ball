"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The advance control with a voice. When the Define gate is open it is a
 * plain submit button; when the gate is closed it becomes the referee:
 * every press gets a whistle, a courtside call, and a spotlight on the
 * three questions. A disabled button is dead air — a refusal that explains
 * itself is coaching.
 *
 * The server action stays the real gate. This component is commentary;
 * the law lives in advanceStageAction.
 */

const CALLS = [
  (n: number) =>
    `whistle! you can't leave define with the story untold. ${n} question${n === 1 ? "" : "s"} still blank.`,
  () =>
    `still whistled. the gate wants three answers: who benefits, what changes, what does done look like.`,
  () => `no secret handshake. the three answers ARE the door.`,
  () => `respect the persistence. the questions have not moved.`,
];

export function AdvanceGate({
  advance,
  locked,
  missing,
  nextStage,
}: {
  advance: () => Promise<void>;
  locked: boolean;
  missing: number;
  nextStage: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [call, setCall] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!locked) {
    return (
      <form action={advance}>
        <button
          type="submit"
          title={`advance to ${nextStage}`}
          className="ml-2 rounded border border-line px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-ball hover:text-ink"
        >
          advance →
        </button>
      </form>
    );
  }

  const blowWhistle = () => {
    const n = attempt + 1;
    setAttempt(n);
    setCall(CALLS[Math.min(n - 1, CALLS.length - 1)](missing));
    setShaking(true);
    setTimeout(() => setShaking(false), 450);

    // Spotlight the three questions themselves
    const panel = document.getElementById("define-panel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
      panel.classList.remove("gate-flash");
      // restart the animation even on rapid re-whistles
      void panel.offsetWidth;
      panel.classList.add("gate-flash");
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCall(null), 4200);
  };

  return (
    <>
      <button
        type="button"
        onClick={blowWhistle}
        aria-describedby={call ? "gate-call" : undefined}
        className={`ml-2 rounded border border-line px-2 py-1 font-mono text-[11px] text-faint transition-colors hover:border-amber hover:text-amber ${
          shaking ? "gate-shake" : ""
        }`}
      >
        advance → <span className="text-amber">· {missing} to answer</span>
      </button>

      {call && (
        <div
          id="gate-call"
          role="status"
          className="fixed bottom-6 left-1/2 z-30 w-max max-w-[90vw] -translate-x-1/2 rounded border border-amber/50 bg-panel px-4 py-2.5 font-mono text-xs text-amber shadow-xl"
        >
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber align-middle" />
          {call}
        </div>
      )}
    </>
  );
}
