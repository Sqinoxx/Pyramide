import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

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
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const limit = checkRateLimit(`login:${email}`, 10, 15 * 60_000);
        if (!limit.allowed) return null;

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) return null;

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
