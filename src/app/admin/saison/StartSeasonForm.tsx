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
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="divisionId" value={divisionId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="label">Saisonname</label>
        <input
          name="name"
          defaultValue={`Saison ${new Date().getFullYear()}`}
          className="input"
        />
      </div>
      <SubmitButton>{pending ? "Wird gestartet…" : `${divisionName}-Pyramide starten`}</SubmitButton>
      {state.error && <FormError message={state.error} />}
    </form>
  );
}
