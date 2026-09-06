"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/form";

export function RequestResetForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialActionState,
  );

  if (state.success) {
    return (
      <FormSuccess message="Falls ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen geschickt." />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <SubmitButton>{pending ? "Wird gesendet…" : "Link anfordern"}</SubmitButton>
    </form>
  );
}
