import { AuthButtons } from "@/app/components/auth-buttons";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">
            Whose Ball
          </span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
            cohort PM
          </span>
        </div>
        <AuthButtons />
      </header>

      <section className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your weekly update is the ball.
          </h1>
          <p className="max-w-2xl text-lg text-neutral-400">
            GitHub Projects shows you the cards. Whose Ball reads your PRs,
            writes your weekly ship update for you, and runs Friday&apos;s vote:
            the only tab that earns being opened.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-800 p-5">
            <h2 className="font-medium">Shipping heartbeat</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Who shipped what this week, pulled from GitHub. Pass your update to
              the agent or post it yourself.
            </p>
            <span className="mt-3 inline-block text-xs text-neutral-600">
              Phase 1
            </span>
          </div>
          <div className="rounded-lg border border-neutral-800 p-5">
            <h2 className="font-medium">Friday voting console</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Every trying-to-win submission, one upvote per builder. Runs this
              week&apos;s vote.
            </p>
            <span className="mt-3 inline-block text-xs text-neutral-600">
              Phase 3
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-600">
          Cursor Boston Super Builder, C2 Week 1. Scaffold live; screens land
          next.
        </p>
      </section>
    </main>
  );
}
