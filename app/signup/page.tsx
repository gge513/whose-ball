import Link from "next/link";

import { AuthButtons } from "@/app/components/auth-buttons";
import { SiteHeader } from "@/app/components/site-header";

import { registerAction } from "./actions";

export default async function SignupPage({
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
          Create account
        </h1>
        <p className="mt-1 font-mono text-xs text-muted">
          open registration — or use{" "}
          <Link href="/signin" className="text-ball hover:underline">
            GitHub sign-in
          </Link>{" "}
          instead
        </p>

        {error === "exists" && (
          <p className="mt-4 rounded border border-amber/40 bg-panel px-3 py-2 font-mono text-xs text-amber">
            That email already has an account.{" "}
            <Link href="/signin" className="underline">
              Sign in?
            </Link>
          </p>
        )}
        {error === "invalid" && (
          <p className="mt-4 rounded border border-amber/40 bg-panel px-3 py-2 font-mono text-xs text-amber">
            Name, email, and a password of at least 8 characters, please.
          </p>
        )}

        <form action={registerAction} className="mt-6 space-y-3">
          <input
            name="name"
            required
            placeholder="name"
            className="w-full rounded border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-ball focus:outline-none"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email"
            className="w-full rounded border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-ball focus:outline-none"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="password (8+ characters)"
            className="w-full rounded border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-ball focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded bg-ball px-3 py-2 font-mono text-sm font-bold text-court hover:bg-ball-deep"
          >
            create account
          </button>
        </form>
      </main>
    </div>
  );
}
