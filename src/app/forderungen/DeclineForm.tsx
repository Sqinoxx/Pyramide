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
        className="btn btn-secondary w-full sm:w-auto"
      >
        Ablehnen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <input type="hidden" name="challengeId" value={challengeId} />
      <FormError message={state.error} />
      <textarea
        name="reason"
        rows={2}
        placeholder="Grund (optional, wird beim Gegenüber angezeigt)"
        className="input"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="btn btn-danger">
          {pending ? "…" : "Ablehnung bestätigen"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
          Zurück
        </button>
      </div>
    </form>
  );
}
