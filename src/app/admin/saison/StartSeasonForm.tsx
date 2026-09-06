"use client";

import { useActionState } from "react";
import { startSeasonAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

export function StartSeasonForm({ divisionId, divisionName }: { divisionId: string; divisionName: string }) {
  const [state, formAction, pending] = useActionState(startSeasonAction, initialActionState);

  if (state.success) {
    return <FormSuccess message={`Saison für ${divisionName} wurde gestartet.`} />;
  }

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="divisionId" value={divisionId} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Saisonname</label>
        <input
          name="name"
          defaultValue={`Saison ${new Date().getFullYear()}`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <SubmitButton>{pending ? "Wird gestartet…" : `${divisionName}-Pyramide starten`}</SubmitButton>
      {state.error && <FormError message={state.error} />}
    </form>
  );
}
