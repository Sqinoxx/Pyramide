"use client";

import { useActionState } from "react";
import { joinAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, SelectField, FormError, FormSuccess, SubmitButton } from "@/components/form";

export function JoinForm() {
  const [state, formAction, pending] = useActionState(joinAction, initialActionState);

  if (state.success) {
    return (
      <FormSuccess message="Fast geschafft: Wir haben dir eine E-Mail geschickt. Bitte bestätige deine Anmeldung über den Link darin — danach prüft ein Admin deine Anmeldung." />
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
      <Field
        label="ITN (falls bekannt)"
        name="itn"
        type="number"
        placeholder="z. B. 5.5 — leer lassen, falls noch keine vorhanden"
        error={state.fieldErrors?.itn}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Verein" name="club" placeholder="z. B. UTC Neukirchen" />
        <Field label="Telefon (optional)" name="phone" type="tel" />
      </div>
      <SubmitButton>{pending ? "Wird gesendet…" : "Zur Pyramide anmelden"}</SubmitButton>
    </form>
  );
}
