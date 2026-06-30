import { signIn, signOut, getSession } from "@/auth";

/**
 * Server-component sign-in / sign-out control using Auth.js v5 server actions.
 * No client SessionProvider needed: session is read server-side and the
 * forms post to the signIn / signOut actions.
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
        <span className="text-sm text-neutral-400">@{label}</span>
        <button
          type="submit"
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Sign out
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
        className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200"
      >
        Sign in with GitHub
      </button>
    </form>
  );
}
