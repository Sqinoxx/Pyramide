"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/form";

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialActionState);

  if (state.success) {
    return (
      <>
        <FormSuccess message="Dein Passwort wurde geändert." />
        <Link href="/login" className="mt-4 inline-block text-sm font-medium underline">
          Zur Anmeldung
        </Link>
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <Field
        label="Neues Passwort"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
      />
      <Field
        label="Passwort bestätigen"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.passwordConfirm}
      />
      <SubmitButton>{pending ? "Wird gespeichert…" : "Passwort speichern"}</SubmitButton>
    </form>
  );
}
