"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema, magicLoginRequestSchema } from "@/lib/validation";
import { requestMagicLogin } from "@/server/magic-login";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

/** Primary member login: request a magic link, no password. */
export async function requestMagicLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = magicLoginRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const { email } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  // Two limits: per-email (a specific inbox can't be spammed) and per-IP
  // (one visitor can't cycle through many addresses), same reasoning as the
  // password-reset request.
  const emailLimit = checkRateLimit(`magic-login-request:${email}`, 5, 15 * 60_000);
  const ipLimit = checkRateLimit(`magic-login-request-ip:${ip}`, 20, 15 * 60_000);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    // Still the generic success message — don't reveal rate limiting exists.
    return { success: true };
  }

  await requestMagicLogin(email);
  return { success: true };
}

/** Admin-only password login — members never see this form, see LoginForm.tsx. */
export async function adminLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const { email, password } = parsed.data;
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
