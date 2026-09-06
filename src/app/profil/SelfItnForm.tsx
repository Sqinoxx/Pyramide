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
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="value" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
            className="w-28 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          {state.fieldErrors?.value && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.value}</p>
          )}
        </div>
        <SubmitButton>{pending ? "Wird gespeichert…" : "Übernehmen"}</SubmitButton>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Wird nur verwendet, solange kein offizieller OÖTV-Wert vorliegt oder
        als Hinweis, falls beide stark voneinander abweichen.
      </p>
    </form>
  );
}
