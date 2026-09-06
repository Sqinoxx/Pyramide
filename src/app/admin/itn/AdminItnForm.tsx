"use client";

import { useActionState } from "react";
import { setAdminItnAction } from "./actions";
import { initialActionState } from "@/lib/form-state";

export function AdminItnForm({ memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState(setAdminItnAction, initialActionState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <input
        name="value"
        type="number"
        step="0.1"
        min="1.0"
        max="10.3"
        placeholder="ITN"
        className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {pending ? "…" : "Manuell setzen"}
      </button>
      {state.fieldErrors?.value && (
        <span className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.value}</span>
      )}
      {state.success && <span className="text-xs text-green-600 dark:text-green-400">Gesetzt.</span>}
    </form>
  );
}
