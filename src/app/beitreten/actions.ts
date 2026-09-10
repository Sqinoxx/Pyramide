"use server";

import { headers } from "next/headers";
import { joinSchema } from "@/lib/validation";
import { joinPyramid, EmailInUseError } from "@/server/join";
import { checkRateLimit } from "@/lib/rate-limit";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";

export async function joinAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`join:${ip}`, 5, 60 * 60_000);
  if (!limit.allowed) {
    return { error: "Zu viele Anmeldungen von dieser IP-Adresse. Bitte später erneut versuchen." };
  }

  try {
    await joinPyramid(parsed.data);
  } catch (err) {
    if (err instanceof EmailInUseError) {
      return { fieldErrors: { email: err.message } };
    }
    console.error("[join] failed", err);
    return { error: "Anmeldung fehlgeschlagen. Bitte versuche es erneut." };
  }

  return { success: true };
}
