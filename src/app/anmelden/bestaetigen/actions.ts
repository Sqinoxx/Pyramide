"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function confirmMagicLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "");

  if (!email || !token) {
    redirect("/anmelden/bestaetigen/ergebnis");
  }

  try {
    await signIn("magic-link", { email, token, redirectTo: "/profil" });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/anmelden/bestaetigen/ergebnis");
    }
    // next/navigation's redirect() (used internally by signIn on success)
    // throws a control-flow signal that must propagate, not be swallowed.
    throw err;
  }
}
