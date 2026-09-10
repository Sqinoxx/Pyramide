"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { loginSchema, emailSchema } from "@/lib/validation";
import { resendVerificationEmail } from "@/server/members";
import { checkRateLimit } from "@/lib/rate-limit";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

export type LoginActionState = ActionState & { unverifiedEmail?: string };

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user && !user.emailVerifiedAt) {
    return {
      error: "Bitte bestätige zuerst deine E-Mail-Adresse — wir haben dir einen Link geschickt.",
      unverifiedEmail: email,
    };
  }

  const callbackUrl = (formData.get("callbackUrl") as string) || "/profil";

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "E-Mail oder Passwort ist falsch." };
    }
    // next/navigation's redirect() (used internally by signIn on success)
    // throws a control-flow signal that must propagate, not be swallowed.
    throw err;
  }

  return {};
}

export async function resendVerificationAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: "Ungültige E-Mail-Adresse." };
  }
  const email = parsed.data;

  const limit = checkRateLimit(`resend-verification:${email}`, 3, 15 * 60_000);
  if (!limit.allowed) {
    // Same generic response either way — don't reveal rate limiting exists
    // to someone probing for valid emails.
    return { success: true, unverifiedEmail: email };
  }

  await resendVerificationEmail(email);
  return { success: true, unverifiedEmail: email };
}
