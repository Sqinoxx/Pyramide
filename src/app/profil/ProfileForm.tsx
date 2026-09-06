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
      <Field label="Verein" name="club" defaultValue={props.club ?? ""} />
      <Field label="Telefon" name="phone" type="tel" defaultValue={props.phone ?? ""} />
      <div className="flex flex-col gap-1">
        <label htmlFor="preferredTimes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Bevorzugte Spielzeiten
        </label>
        <textarea
          id="preferredTimes"
          name="preferredTimes"
          rows={2}
          defaultValue={props.preferredTimes ?? ""}
          placeholder="z. B. Werktags ab 18 Uhr, Wochenende vormittags"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <CheckboxField
        label="ITN öffentlich in der Pyramide anzeigen"
        name="showItnPublicly"
        defaultChecked={props.showItnPublicly}
      />
      <div>
        <SubmitButton>{pending ? "Wird gespeichert…" : "Speichern"}</SubmitButton>
      </div>
    </form>
  );
}
