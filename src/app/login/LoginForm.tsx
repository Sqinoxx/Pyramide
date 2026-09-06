"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, FormError, SubmitButton } from "@/components/form";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormError message={state.error} />
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <Field
        label="Passwort"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton>{pending ? "Wird geprüft…" : "Anmelden"}</SubmitButton>
    </form>
  );
}
