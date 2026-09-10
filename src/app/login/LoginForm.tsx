"use client";

import { useActionState } from "react";
import { loginAction, resendVerificationAction, type LoginActionState } from "./actions";
import { initialActionState } from "@/lib/form-state";

const initialLoginState: LoginActionState = initialActionState;
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/form";

function ResendVerificationForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(resendVerificationAction, initialActionState);

  if (state.success) {
    return (
      <FormSuccess message="Falls das Konto existiert und noch nicht bestätigt ist, haben wir einen neuen Link geschickt." />
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="email" value={email} />
      <button type="submit" className="text-sm underline text-zinc-600 dark:text-zinc-400">
        {pending ? "Wird gesendet…" : "Bestätigungslink erneut senden"}
      </button>
    </form>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialLoginState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormError message={state.error} />
      {state.unverifiedEmail && <ResendVerificationForm email={state.unverifiedEmail} />}
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
