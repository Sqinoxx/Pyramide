"use client";

import { useActionState } from "react";
import { setLeaveAction, clearLeaveAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError, SubmitButton } from "@/components/form";

export function LeaveForm({ onLeaveUntil }: { onLeaveUntil: string | null }) {
  const [state, formAction, pending] = useActionState(setLeaveAction, initialActionState);

  if (onLeaveUntil) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <p className="text-zinc-700 dark:text-zinc-300">
          Du bist im Urlaubsmodus bis{" "}
          <strong>{new Date(onLeaveUntil).toLocaleDateString("de-AT")}</strong> — in dieser Zeit
          kannst du weder fordern noch gefordert werden.
        </p>
        <form action={clearLeaveAction}>
          <button type="submit" className="underline">
            Beenden
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex items-end gap-3">
      <FormError message={state.fieldErrors?.until} />
      <div className="flex flex-col gap-1">
        <label htmlFor="until" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Urlaubs-/Verletzungsmodus bis
        </label>
        <input
          id="until"
          name="until"
          type="date"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <SubmitButton>{pending ? "…" : "Aktivieren"}</SubmitButton>
    </form>
  );
}
