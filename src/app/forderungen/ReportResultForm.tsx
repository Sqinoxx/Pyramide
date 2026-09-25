"use client";

import { useActionState, useState } from "react";
import { reportResultAction } from "./actions";
import { initialActionState } from "@/lib/form-state";
import { FormError } from "@/components/form";

const scoreInput =
  "input w-14 px-0 text-center text-lg font-semibold tabular-nums sm:w-14 sm:text-base";
const tbInput = "input w-14 px-0 text-center tabular-nums sm:w-12 sm:text-xs";

function SetInputs({ n, isTiebreak }: { n: number; isTiebreak: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface px-3 py-2.5 sm:flex-nowrap">
      <span className="w-16 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {isTiebreak ? "Match-TB" : `Satz ${n}`}
      </span>
      {isTiebreak ? (
        <div className="flex items-center gap-2">
          <input
            name={`set${n}TbA`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="10"
            aria-label={`Match-Tiebreak Punkte fordernde Person`}
            className={scoreInput}
          />
          <span className="text-zinc-400">:</span>
          <input
            name={`set${n}TbB`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="7"
            aria-label={`Match-Tiebreak Punkte geforderte Person`}
            className={scoreInput}
          />
          {/* gamesA/gamesB are required by the server's SetScore shape; 0:0 is the convention for a match-tiebreak "set". */}
          <input type="hidden" name={`set${n}A`} value={0} />
          <input type="hidden" name={`set${n}B`} value={0} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              name={`set${n}A`}
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              placeholder="6"
              aria-label={`Satz ${n} Games fordernde Person`}
              className={scoreInput}
            />
            <span className="text-zinc-400">:</span>
            <input
              name={`set${n}B`}
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              placeholder="4"
              aria-label={`Satz ${n} Games geforderte Person`}
              className={scoreInput}
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <span className="hint flex-1 sm:flex-none">bei 7:6 Tiebreak:</span>
            <input
              name={`set${n}TbA`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="TB"
              aria-label={`Satz ${n} Tiebreak fordernde Person`}
              className={tbInput}
            />
            <input
              name={`set${n}TbB`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="TB"
              aria-label={`Satz ${n} Tiebreak geforderte Person`}
              className={tbInput}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function ReportResultForm({ challengeId }: { challengeId: string }) {
  const [state, formAction, pending] = useActionState(reportResultAction, initialActionState);
  const [needsThirdSet, setNeedsThirdSet] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-3">
      <input type="hidden" name="challengeId" value={challengeId} />
      <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
        Games aus Sicht der fordernden Person zuerst.
      </p>
      <FormError message={state.error} />
      <SetInputs n={1} isTiebreak={false} />
      <SetInputs n={2} isTiebreak={false} />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={needsThirdSet}
          onChange={(e) => setNeedsThirdSet(e.target.checked)}
          className="h-5 w-5 accent-brand-600"
        />
        3. Satz / Match-Tiebreak nötig
      </label>
      {needsThirdSet && <SetInputs n={3} isTiebreak />}
      <button type="submit" className="btn btn-primary mt-1 w-full sm:w-fit">
        {pending ? "Wird gemeldet…" : "Ergebnis melden"}
      </button>
    </form>
  );
}
