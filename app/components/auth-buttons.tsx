import { signIn, signOut, getSession } from "@/auth";

/**
 * Server-component sign-in / sign-out control using Auth.js v5 server actions.
 */
export async function AuthButtons() {
  const session = await getSession();

  if (session?.user) {
    const label = session.user.login ?? session.user.name ?? "signed in";
    return (
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
        className="flex items-center gap-3"
      >
        <span className="font-mono text-xs text-muted">@{label}</span>
        <button
          type="submit"
          className="rounded-md border border-line-soft px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-line hover:text-ink"
        >
          sign out
        </button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("github");
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-2 rounded-md border border-line bg-panel px-3.5 py-1.5 font-mono text-xs font-medium text-ink transition-colors hover:border-muted"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
        sign in with GitHub
      </button>
    </form>
  );
}
