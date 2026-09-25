"use client";

import { useActionState } from "react";
import { importClubMembersAction, type ImportActionState } from "./actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

const initialState: ImportActionState = {};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importClubMembersAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      {state.success && <FormSuccess message={`${state.rowCount} Zeile(n) importiert.`} />}
      {state.parseErrors && state.parseErrors.length > 0 && (
        <div className="alert alert-warning">
          <p className="mb-1 font-medium">{state.parseErrors.length} Zeile(n) übersprungen:</p>
          <ul className="list-inside list-disc">
            {state.parseErrors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="label">
          CSV-Datei
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
          className="input py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-800 dark:file:bg-brand-950 dark:file:text-brand-200"
        />
      </div>

      <p className="flex items-center gap-3 text-xs font-medium tracking-wider text-zinc-400 uppercase">
        <span className="h-px flex-1 bg-line" />
        oder
        <span className="h-px flex-1 bg-line" />
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pasted" className="label">
          Tabelle einfügen
        </label>
        <textarea
          id="pasted"
          name="pasted"
          rows={8}
          placeholder={"Nachname\tVorname\tJahrgang\tE-Mail\nGruber\tMichael\t1988\tmichael@example.com"}
          className="input font-mono sm:text-xs"
        />
        <p className="hint">
          Nachname und Vorname sind Pflicht, Jahrgang und E-Mail optional —
          Komma, Semikolon oder Tab werden automatisch erkannt.
        </p>
      </div>

      <SubmitButton className="w-full sm:w-fit">
        {pending ? "Wird importiert…" : "Importieren"}
      </SubmitButton>
    </form>
  );
}
