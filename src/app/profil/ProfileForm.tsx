"use client";

import { useActionState } from "react";
import { updateProfileAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { Field, CheckboxField, FormError, FormSuccess, SubmitButton } from "@/components/form";

export function ProfileForm(props: {
  club: string | null;
  phone: string | null;
  preferredTimes: string | null;
  showItnPublicly: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success ? "Gespeichert." : undefined} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Verein" name="club" defaultValue={props.club ?? ""} />
        <Field label="Telefon" name="phone" type="tel" defaultValue={props.phone ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="preferredTimes" className="label">
          Bevorzugte Spielzeiten
        </label>
        <textarea
          id="preferredTimes"
          name="preferredTimes"
          rows={2}
          defaultValue={props.preferredTimes ?? ""}
          placeholder="z. B. Werktags ab 18 Uhr, Wochenende vormittags"
          className="input"
        />
      </div>
      <CheckboxField
        label="ITN öffentlich in der Pyramide anzeigen"
        name="showItnPublicly"
        defaultChecked={props.showItnPublicly}
      />
      <SubmitButton className="w-full sm:w-fit">
        {pending ? "Wird gespeichert…" : "Speichern"}
      </SubmitButton>
    </form>
  );
}
