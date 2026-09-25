import type { PyramidRow } from "@/server/seasons";
import { formatItnBadge } from "@/lib/itn-precedence";
import { rankOf } from "@/lib/pyramid";
import { createChallengeAction } from "@/app/forderungen/actions";
import { EmptyState } from "./ui";

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
      <EmptyState>Diese Pyramide wurde noch nicht gestartet.</EmptyState>
    );
  }

  const byRow = groupByRow(rows);

  return (
    // Phones get the pyramid as stacked, labelled rows in a grid (a real
    // triangle would need ~8 cards side by side); from md up it's the
    // classic centred pyramid, scrolling sideways only if a row is too wide.
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-6 md:mx-auto md:w-max md:items-center md:gap-3">
        {byRow.map((row, i) => (
          <div key={i} className="w-full md:w-auto">
            <h3 className="mb-2 flex items-center gap-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase md:hidden dark:text-zinc-400">
              Reihe {i + 1}
              <span className="h-px flex-1 bg-line" />
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:justify-center md:gap-3">
              {row.map((entry) => {
                const isSelf = entry.memberId === viewerMemberId;
                const canChallenge = !isSelf && eligibleMemberIds?.has(entry.memberId);
                const rank = rankOf({ row: entry.row, slot: entry.slot });
                return (
                  <div
                    key={entry.memberId}
                    className={
                      "relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-2.5 pt-3 pb-3 text-center shadow-sm transition-shadow md:w-36 lg:w-40 " +
                      (isSelf
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-950"
                        : canChallenge
                          ? "border-brand-200 bg-surface hover:shadow-md dark:border-brand-900"
                          : "border-line bg-surface")
                    }
                  >
                    <span
                      className={
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums " +
                        (rank === 1
                          ? "bg-ball text-zinc-900"
                          : isSelf
                            ? "bg-brand-600 text-white"
                            : "bg-surface-muted text-zinc-500 dark:text-zinc-400")
                      }
                    >
                      {rank}
                    </span>
                    {isSelf && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300">
                        Du
                      </span>
                    )}
                    <span className="w-full text-sm leading-snug font-medium break-words text-zinc-900 dark:text-zinc-50">
                      {entry.firstName} {entry.lastName}
                    </span>
                    {entry.itn && entry.showItnPublicly && (
                      <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                        {formatItnBadge(entry.itn)}
                      </span>
                    )}
                    {canChallenge && seasonId && (
                      <form action={createChallengeAction} className="mt-auto w-full pt-1">
                        <input type="hidden" name="seasonId" value={seasonId} />
                        <input type="hidden" name="defenderId" value={entry.memberId} />
                        <button type="submit" className="btn btn-primary btn-sm w-full">
                          Fordern
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
