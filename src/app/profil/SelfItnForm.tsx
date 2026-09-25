"use client";

import { useActionState } from "react";
import { setSelfItnAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

export function SelfItnForm({ currentValue }: { currentValue: number | null }) {
  const [state, formAction, pending] = useActionState(setSelfItnAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <FormSuccess message={state.success ? "ITN gespeichert." : undefined} />
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="flex flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="value" className="label">
            Eigene ITN-Angabe
          </label>
          <input
            id="value"
            name="value"
            type="number"
            step="0.1"
            min="1.0"
            max="10.3"
            defaultValue={currentValue ?? undefined}
            placeholder="z. B. 5.5"
            inputMode="decimal"
            className="input sm:w-32"
          />
          {state.fieldErrors?.value && (
            <p className="field-error">{state.fieldErrors.value}</p>
          )}
        </div>
        <SubmitButton>{pending ? "Wird gespeichert…" : "Übernehmen"}</SubmitButton>
      </div>
      <p className="hint">
        Wird nur verwendet, solange kein offizieller OÖTV-Wert vorliegt oder
        als Hinweis, falls beide stark voneinander abweichen.
      </p>
    </form>
  );
}
