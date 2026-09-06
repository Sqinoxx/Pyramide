"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { resetPasswordSchema } from "@/lib/validation";
import { consumeVerificationToken } from "@/server/tokens";
import { hashPassword } from "@/lib/password";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const { email, token, password } = parsed.data;

  const result = await consumeVerificationToken(token, email, "reset-password");
  if (!result.ok) {
    return {
      error:
        result.reason === "already_used"
          ? "Dieser Link wurde bereits verwendet. Bitte fordere einen neuen an."
          : "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
    };
  }

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.email, email));

  return { success: true };
}
