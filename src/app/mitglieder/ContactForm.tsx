"use client";

import { useActionState, useState } from "react";
import { sendContactAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError, FormSuccess } from "@/components/form";

export function ContactForm({ toMemberId }: { toMemberId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(sendContactAction, initialActionState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Nachricht senden"
        className="btn btn-secondary btn-sm"
      >
        Nachricht<span className="hidden sm:inline"> senden</span>
      </button>
    );
  }

  if (state.success) {
    return <FormSuccess message="Gesendet." />;
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-2 sm:w-64">
      <input type="hidden" name="toMemberId" value={toMemberId} />
      <FormError message={state.error} />
      <textarea
        name="message"
        rows={3}
        autoFocus
        placeholder="Nachricht (z. B. Terminvorschlag)"
        className="input"
      />
      <div className="grid grid-cols-2 gap-2">
        <button type="submit" className="btn btn-primary btn-sm">
          {pending ? "…" : "Senden"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
