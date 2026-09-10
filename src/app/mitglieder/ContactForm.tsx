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
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
      >
        Nachricht senden
      </button>
    );
  }

  if (state.success) {
    return <FormSuccess message="Gesendet." />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="toMemberId" value={toMemberId} />
      <FormError message={state.error} />
      <textarea
        name="message"
        rows={2}
        placeholder="Nachricht (z. B. Terminvorschlag)"
        className="w-56 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "…" : "Senden"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
