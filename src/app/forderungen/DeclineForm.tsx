"use client";

import { useActionState, useState } from "react";
import { declineChallengeAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError } from "@/components/form";

export function DeclineForm({ challengeId }: { challengeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(declineChallengeAction, initialActionState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      >
        Ablehnen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="challengeId" value={challengeId} />
      <FormError message={state.error} />
      <textarea
        name="reason"
        rows={2}
        placeholder="Grund (optional, wird beim Gegenüber angezeigt)"
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          {pending ? "…" : "Ablehnung bestätigen"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Zurück
        </button>
      </div>
    </form>
  );
}
