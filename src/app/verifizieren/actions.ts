"use server";

import { redirect } from "next/navigation";
import { consumeVerificationToken } from "@/server/tokens";
import { markEmailVerified } from "@/server/members";

export async function confirmEmailAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "");

  if (!email || !token) redirect("/verifizieren/ergebnis?status=invalid");

  const result = await consumeVerificationToken(token, email, "verify-email");
  if (!result.ok) {
    redirect(`/verifizieren/ergebnis?status=${result.reason}`);
  }

  await markEmailVerified(email);
  redirect("/verifizieren/ergebnis?status=ok");
}
