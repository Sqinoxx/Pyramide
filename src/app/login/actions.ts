"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { loginSchema } from "@/lib/validation";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user && !user.emailVerifiedAt) {
    return { error: "Bitte bestätige zuerst deine E-Mail-Adresse — wir haben dir einen Link geschickt." };
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
