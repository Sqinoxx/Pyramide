"use client";

import { useActionState } from "react";
import { setLeaveAction, clearLeaveAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError, SubmitButton } from "@/components/form";

export function LeaveForm({ onLeaveUntil }: { onLeaveUntil: string | null }) {
  const [state, formAction, pending] = useActionState(setLeaveAction, initialActionState);

  if (onLeaveUntil) {
    return (
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center">
        <p className="flex-1 text-zinc-700 dark:text-zinc-300">
          Du bist im Urlaubsmodus bis{" "}
          <strong>{new Date(onLeaveUntil).toLocaleDateString("de-AT")}</strong> — in dieser Zeit
          kannst du weder fordern noch gefordert werden.
        </p>
        <form action={clearLeaveAction}>
          <button type="submit" className="btn btn-secondary w-full sm:w-auto">
            Beenden
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.fieldErrors?.until} />
      <p className="hint">
        In dieser Zeit kannst du weder fordern noch gefordert werden, und die
        Inaktivitätsregel pausiert.
      </p>
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="flex flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="until" className="label">
            Urlaubs-/Verletzungsmodus bis
          </label>
          <input id="until" name="until" type="date" className="input sm:w-48" />
        </div>
        <SubmitButton>{pending ? "…" : "Aktivieren"}</SubmitButton>
      </div>
    </form>
  );
}
