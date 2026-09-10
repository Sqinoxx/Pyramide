import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { loginSchema, emailSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumeVerificationToken } from "@/server/tokens";
import { markEmailVerified } from "@/server/members";

declare module "next-auth" {
  interface User {
    role?: "member" | "admin";
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: "member" | "admin";
    };
  }
}

// Not augmenting "next-auth/jwt" here: this beta's package.json exports it
// correctly, but TS's bundler resolution can't follow the augmentation
// target reliably across the nested @auth/core install next-auth vendors.
// The jwt()/session() callbacks below use a small local type instead.
type AppJWT = { id: string; role: "member" | "admin" };

/**
 * JWT session strategy — deliberately not next-auth's database adapter,
 * which is built around OAuth account linking we don't use. Login, email
 * verification and password reset are hand-rolled against `users` and
 * `verification_tokens` (see src/server/tokens.ts). Member-specific state
 * (division, approval status) is intentionally NOT cached in the token —
 * pages that need it call getMemberByUserId() for a fresh read, so an admin
 * approval takes effect immediately instead of waiting for re-login.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Auth.js only trusts the incoming Host header by default on Vercel;
  // everywhere else (this app: Docker behind Caddy, per PLAN.md §11) it
  // rejects every request with "UntrustedHost" unless told otherwise. Safe
  // here because Caddy is the only thing that can reach the app container
  // (see docker-compose.yml's network split) and terminates TLS itself, so
  // there's no untrusted edge forging the Host header directly at the app.
  trustHost: true,
  providers: [
    // Password login — only ever used by admin accounts now (members join
    // and log in passwordlessly, see the "magic-link" provider below;
    // users.passwordHash is nullable precisely because member accounts
    // never get one).
    Credentials({
      id: "credentials",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const limit = checkRateLimit(`login:${email}`, 10, 15 * 60_000);
        if (!limit.allowed) return null;

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // The login action already checks emailVerifiedAt up front and shows
        // a specific "please verify" message; this is just defense in depth,
        // so a generic rejection (rather than a distinguishable thrown
        // error) is fine here.
        if (!user.emailVerifiedAt) return null;

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
    // Magic-link login for members: proof of owning the inbox (clicking the
    // link, which lands on /anmelden/bestaetigen and posts email+token here)
    // stands in for a password. Consuming the token is itself sufficient
    // proof of email ownership, so this also marks the address verified if
    // it somehow wasn't yet (e.g. the very first login right after joining).
    Credentials({
      id: "magic-link",
      credentials: { email: {}, token: {} },
      async authorize(raw) {
        const emailResult = emailSchema.safeParse(raw?.email);
        const token = typeof raw?.token === "string" ? raw.token : "";
        if (!emailResult.success || !token) return null;
        const email = emailResult.data;

        const limit = checkRateLimit(`magic-login:${email}`, 10, 15 * 60_000);
        if (!limit.allowed) return null;

        const result = await consumeVerificationToken(token, email, "magic-login");
        if (!result.ok) return null;

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) return null;

        if (!user.emailVerifiedAt) await markEmailVerified(email);

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as unknown as AppJWT;
      if (user) {
        t.id = user.id as string;
        t.role = user.role as "member" | "admin";
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as unknown as AppJWT;
      session.user.id = t.id;
      session.user.role = t.role;
      return session;
    },
  },
});
