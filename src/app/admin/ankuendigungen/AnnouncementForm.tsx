"use client";

import { useActionState } from "react";
import { createAnnouncementAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

export function AnnouncementForm({
  divisions,
}: {
  divisions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createAnnouncementAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <FormSuccess message={state.success ? "Veröffentlicht." : undefined} />
      <div className="flex flex-col gap-1.5">
        <label className="label">Titel</label>
        <input
          name="title"
          className="input"
        />
        {state.fieldErrors?.title && (
          <p className="field-error">{state.fieldErrors.title}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label">Text</label>
        <textarea
          name="bodyMd"
          rows={4}
          className="input"
        />
        {state.fieldErrors?.bodyMd && (
          <p className="field-error">{state.fieldErrors.bodyMd}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label">Bewerb</label>
        <select
          name="divisionId"
          className="input"
        >
          <option value="">Vereinsweit</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <SubmitButton>{pending ? "Wird veröffentlicht…" : "Veröffentlichen"}</SubmitButton>
      </div>
    </form>
  );
}
