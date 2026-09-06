import type { PyramidRow } from "@/server/seasons";
import { formatItnBadge } from "@/lib/itn-precedence";

function groupByRow(rows: PyramidRow[]): PyramidRow[][] {
  const maxRow = rows.reduce((max, r) => Math.max(max, r.row), 0);
  const grouped: PyramidRow[][] = Array.from({ length: maxRow }, () => []);
  for (const r of rows) grouped[r.row - 1].push(r);
  grouped.forEach((row) => row.sort((a, b) => a.slot - b.slot));
  return grouped;
}

export function PyramidView({ rows }: { rows: PyramidRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Diese Pyramide wurde noch nicht gestartet.
      </p>
    );
  }

  const byRow = groupByRow(rows);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max flex-col items-center gap-2 px-4">
        {byRow.map((row, i) => (
          <div key={i} className="flex gap-2">
            {row.map((entry) => (
              <div
                key={entry.memberId}
                className="flex w-36 flex-col items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-2 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {entry.firstName} {entry.lastName}
                </span>
                {entry.itn && entry.showItnPublicly && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatItnBadge(entry.itn)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
