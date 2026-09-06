"use client";

import { useActionState } from "react";
import { importItnAction, type ImportActionState } from "./actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

const initialState: ImportActionState = {};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importItnAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      {state.success && (
        <FormSuccess message={`${state.rowCount} Zeile(n) importiert.`} />
      )}
      {state.parseErrors && state.parseErrors.length > 0 && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="mb-1 font-medium">
            {state.parseErrors.length} Zeile(n) übersprungen:
          </p>
          <ul className="list-inside list-disc">
            {state.parseErrors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          CSV-Datei
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
          className="text-sm text-zinc-700 dark:text-zinc-300"
        />
      </div>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">oder</p>

      <div className="flex flex-col gap-1">
        <label htmlFor="pasted" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tabelle einfügen
        </label>
        <textarea
          id="pasted"
          name="pasted"
          rows={8}
          placeholder={"Nachname\tVorname\tJahrgang\tGeschlecht\tVerein\tITN\nGruber\tMichael\t1988\tm\tUTC Pyramide\t3.5"}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Direkt aus einer Tabelle (Excel, Google Sheets, oder der OÖTV-Rangliste im
          Browser markiert) kopieren und hier einfügen — Komma, Semikolon oder
          Tab werden automatisch erkannt.
        </p>
      </div>

      <div>
        <SubmitButton>{pending ? "Wird importiert…" : "Importieren"}</SubmitButton>
      </div>
    </form>
  );
}
