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
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Titel</label>
        <input
          name="title"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {state.fieldErrors?.title && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.title}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Text</label>
        <textarea
          name="bodyMd"
          rows={4}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {state.fieldErrors?.bodyMd && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.bodyMd}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bewerb</label>
        <select
          name="divisionId"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
