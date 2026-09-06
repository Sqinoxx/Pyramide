"use server";

import { headers } from "next/headers";
import { registerSchema } from "@/lib/validation";
import { registerMember, EmailInUseError } from "@/server/members";
import { checkRateLimit } from "@/lib/rate-limit";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!limit.allowed) {
    return { error: "Zu viele Registrierungen von dieser IP-Adresse. Bitte später erneut versuchen." };
  }

  try {
    await registerMember(parsed.data);
  } catch (err) {
    if (err instanceof EmailInUseError) {
      return { fieldErrors: { email: err.message } };
    }
    console.error("[register] failed", err);
    return { error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
  }

  return { success: true };
}
