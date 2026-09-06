"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requestPasswordResetSchema } from "@/lib/validation";
import { createVerificationToken } from "@/server/tokens";
import { sendPasswordResetEmail } from "@/server/mailer";
import { checkRateLimit } from "@/lib/rate-limit";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = requestPasswordResetSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const { email } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`reset-request:${ip}`, 5, 15 * 60_000);
  if (!limit.allowed) {
    // Still return the generic message — don't reveal rate limiting exists
    // to someone probing for valid emails.
    return { success: true };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: { member: true },
  });

  // Deliberately the same response whether or not the account exists, so
  // this endpoint can't be used to enumerate registered email addresses.
  if (user) {
    const rawToken = await createVerificationToken(user.email, "reset-password");
    await sendPasswordResetEmail(user.email, user.member?.firstName ?? "", rawToken).catch(
      (err) => console.error("[password-reset] send failed", err),
    );
  }

  return { success: true, error: undefined, fieldErrors: undefined };
}
