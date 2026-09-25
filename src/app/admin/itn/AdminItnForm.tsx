"use client";

import { useActionState } from "react";
import { setAdminItnAction } from "./actions";
import { initialActionState } from "@/lib/form-state";

export function AdminItnForm({ memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState(setAdminItnAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <input
        name="value"
        type="number"
        step="0.1"
        min="1.0"
        max="10.3"
        placeholder="ITN"
        inputMode="decimal"
        aria-label="ITN manuell"
        className="input w-24 sm:w-24"
      />
      <button
        type="submit"
        className="btn btn-secondary"
      >
        {pending ? "…" : "Manuell setzen"}
      </button>
      {state.fieldErrors?.value && (
        <span className="field-error">{state.fieldErrors.value}</span>
      )}
      {state.success && <span className="text-sm text-brand-700 dark:text-brand-300">Gesetzt.</span>}
    </form>
  );
}
