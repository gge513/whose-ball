import Link from "next/link";

import { AuthButtons } from "@/app/components/auth-buttons";
import { SiteHeader } from "@/app/components/site-header";

import { credentialsSignInAction, githubSignInAction } from "./actions";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen">
      <SiteHeader active="me" auth={<AuthButtons />} />
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="font-display text-xl font-extrabold uppercase tracking-[0.08em]">
          Sign in
        </h1>

        {error && (
          <p className="mt-4 rounded border border-amber/40 bg-panel px-3 py-2 font-mono text-xs text-amber">
            That email and password didn&apos;t match.
          </p>
        )}

        <form action={credentialsSignInAction} className="mt-6 space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="email"
            className="w-full rounded border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-muted focus:outline-none"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="password"
            className="w-full rounded border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-muted focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded bg-ink px-3 py-2 font-mono text-sm font-bold text-court hover:bg-white"
          >
            sign in
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[11px] text-faint">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form action={githubSignInAction}>
          <button
            type="submit"
            className="w-full rounded border border-line bg-panel px-3 py-2 font-mono text-sm text-ink hover:border-muted"
          >
            sign in with GitHub
          </button>
        </form>

        <p className="mt-5 font-mono text-xs text-muted">
          No account?{" "}
          <Link href="/signup" className="text-ink underline">
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
}
