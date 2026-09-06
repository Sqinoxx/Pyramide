"use client";

import { useActionState } from "react";
import { registerAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, SelectField, FormError, FormSuccess, SubmitButton } from "@/components/form";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialActionState);

  if (state.success) {
    return (
      <FormSuccess message="Fast geschafft: Wir haben dir eine E-Mail geschickt. Bitte bestätige deine Adresse über den Link darin." />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vorname" name="firstName" required error={state.fieldErrors?.firstName} />
        <Field label="Nachname" name="lastName" required error={state.fieldErrors?.lastName} />
      </div>
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Passwort"
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
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Geburtsjahr"
          name="birthYear"
          type="number"
          required
          error={state.fieldErrors?.birthYear}
        />
        <SelectField
          label="Geschlecht"
          name="gender"
          required
          options={[
            { value: "m", label: "Männlich (Herren-Pyramide)" },
            { value: "w", label: "Weiblich (Damen-Pyramide)" },
          ]}
          error={state.fieldErrors?.gender}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Verein" name="club" placeholder="z. B. UTC Pyramide" />
        <Field label="Telefon (optional)" name="phone" type="tel" />
      </div>
      <SubmitButton>{pending ? "Wird gesendet…" : "Registrieren"}</SubmitButton>
    </form>
  );
}
