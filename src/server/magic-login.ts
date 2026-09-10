import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createVerificationToken } from "./tokens";
import { sendMagicLoginEmail } from "./mailer";

/**
 * Requests a login link for a returning member. Same "always looks like it
 * worked" shape as the password-reset request (src/server/tokens.ts) — an
 * email that isn't registered gets the identical response, so this can't be
 * used to check which addresses have an account.
 */
export async function requestMagicLogin(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: { member: true },
  });
  if (!user) return;

  const rawToken = await createVerificationToken(email, "magic-login");
  await sendMagicLoginEmail(email, user.member?.firstName ?? "", rawToken, false).catch((err) => {
    console.error("[magic-login] send failed", err);
  });
}
