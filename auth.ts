import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js v5 config (App Router native).
 * GitHub provider auto-reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET from env.
 * The jwt + session callbacks expose the GitHub login (handle), which the
 * default session does not carry, so the app can key votes and the heartbeat
 * on the signed-in user's GitHub identity.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    async jwt({ token, profile }) {
      const login = (profile as { login?: string } | undefined)?.login;
      if (login) token.login = login;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.login) {
        session.user.login = token.login as string;
      }
      return session;
    },
  },
});

/**
 * Safe session read for surfaces that must render even before auth is
 * configured (no AUTH_SECRET locally). Returns null instead of throwing.
 */
export async function getSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}
