import type { PyramidRow } from "@/server/seasons";
import { rankOf } from "@/lib/pyramid";
import { createChallengeAction } from "@/app/forderungen/actions";

function groupByRow(rows: PyramidRow[]): PyramidRow[][] {
  const maxRow = rows.reduce((max, r) => Math.max(max, r.row), 0);
  const grouped: PyramidRow[][] = Array.from({ length: maxRow }, () => []);
  for (const r of rows) grouped[r.row - 1].push(r);
  grouped.forEach((row) => row.sort((a, b) => a.slot - b.slot));
  return grouped;
}

export function PyramidView({
  rows,
  seasonId,
  viewerMemberId,
  eligibleMemberIds,
}: {
  rows: PyramidRow[];
  seasonId?: string;
  viewerMemberId?: string;
  eligibleMemberIds?: Set<string>;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Diese Pyramide wurde noch nicht gestartet.
      </p>
    );
  }

  const byRow = groupByRow(rows);

  return (
    <div className="flex flex-col gap-3">
      {viewerMemberId && (
        <div className="flex flex-wrap justify-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border-2 border-sky-600 bg-sky-50 dark:border-sky-400 dark:bg-sky-950" />
            Du
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border-2 border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950" />
            Darfst du fordern
          </span>
        </div>
      )}
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max flex-col items-center gap-2 px-4">
          {byRow.map((row, i) => (
            <div key={i} className="flex gap-2">
              {row.map((entry) => {
                const isSelf = entry.memberId === viewerMemberId;
                const canChallenge =
                  !isSelf && eligibleMemberIds?.has(entry.memberId);
                return (
                  <div
                    key={entry.memberId}
                    className={
                      "flex w-36 flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-center shadow-sm " +
                      (isSelf
                        ? "border-2 border-sky-600 bg-sky-50 ring-2 ring-sky-200 dark:border-sky-400 dark:bg-sky-950 dark:ring-sky-900"
                        : canChallenge
                          ? "border-2 border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950"
                          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900")
                    }
                  >
                    {isSelf && (
                      <span className="rounded-full bg-sky-600 px-2 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Du
                      </span>
                    )}
                    <span className="text-[11px] font-semibold tabular-nums text-zinc-400 dark:text-zinc-500">
                      {rankOf({ row: entry.row, slot: entry.slot })}
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {entry.firstName} {entry.lastName}
                    </span>
                    {canChallenge && seasonId && (
                      <form action={createChallengeAction}>
                        <input type="hidden" name="seasonId" value={seasonId} />
                        <input
                          type="hidden"
                          name="defenderId"
                          value={entry.memberId}
                        />
                        <button
                          type="submit"
                          className="mt-1 rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Fordern
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
