"use client";

import { useActionState, useState } from "react";
import { reportResultAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError } from "@/components/form";

function SetInputs({ n, isTiebreak }: { n: number; isTiebreak: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-sm text-zinc-600 dark:text-zinc-400">
        {isTiebreak ? "Match-TB" : `Satz ${n}`}
      </span>
      {isTiebreak ? (
        <>
          <input
            name={`set${n}TbA`}
            type="number"
            min={0}
            placeholder="10"
            className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span>:</span>
          <input
            name={`set${n}TbB`}
            type="number"
            min={0}
            placeholder="7"
            className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {/* gamesA/gamesB are required by the server's SetScore shape; 0:0 is the convention for a match-tiebreak "set". */}
          <input type="hidden" name={`set${n}A`} value={0} />
          <input type="hidden" name={`set${n}B`} value={0} />
        </>
      ) : (
        <>
          <input
            name={`set${n}A`}
            type="number"
            min={0}
            max={7}
            placeholder="6"
            className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span>:</span>
          <input
            name={`set${n}B`}
            type="number"
            min={0}
            max={7}
            placeholder="4"
            className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="ml-2 text-xs text-zinc-400">bei 7:6 zusätzlich Tiebreak:</span>
          <input
            name={`set${n}TbA`}
            type="number"
            min={0}
            placeholder="TB"
            className="w-12 rounded border border-zinc-300 px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name={`set${n}TbB`}
            type="number"
            min={0}
            placeholder="TB"
            className="w-12 rounded border border-zinc-300 px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
        </>
      )}
    </div>
  );
}

export function ReportResultForm({ challengeId }: { challengeId: string }) {
  const [state, formAction, pending] = useActionState(reportResultAction, initialActionState);
  const [needsThirdSet, setNeedsThirdSet] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
      <input type="hidden" name="challengeId" value={challengeId} />
      <FormError message={state.error} />
      <SetInputs n={1} isTiebreak={false} />
      <SetInputs n={2} isTiebreak={false} />
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={needsThirdSet}
          onChange={(e) => setNeedsThirdSet(e.target.checked)}
        />
        3. Satz / Match-Tiebreak nötig
      </label>
      {needsThirdSet && <SetInputs n={3} isTiebreak />}
      <button
        type="submit"
        className="mt-1 w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Wird gemeldet…" : "Ergebnis melden"}
      </button>
    </form>
  );
}
