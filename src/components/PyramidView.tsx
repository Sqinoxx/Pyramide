import type { PyramidRow } from "@/server/seasons";
import { formatItnBadge } from "@/lib/itn-precedence";
import { rankOf } from "@/lib/pyramid";
import { createChallengeAction } from "@/app/forderungen/actions";
import type { PyramidLayout } from "@/lib/pyramid-layout";
import { EmptyState } from "./ui";
import { PyramidScroller } from "./PyramidScroller";
import { HourglassIcon } from "./icons";

function quotaTitle(quota: NonNullable<PyramidRow["quota"]>): string {
  const date = quota.deadline.toLocaleDateString("de-AT");
  return quota.state === "overdue"
    ? `Mindestspiele nicht erreicht (${quota.played}/${quota.required} bis ${date}) — Ausschluss durch Admin möglich`
    : `Noch ${quota.required - quota.played} Spiel(e) bis ${date} nötig (${quota.played}/${quota.required})`;
}

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
  layout = "liste",
}: {
  layout?: PyramidLayout;
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
  const triangle = layout === "pyramide";

  // "liste": phones get stacked, labelled rows in a grid; from md up it's
  // the classic centred pyramid. "pyramide": the triangle on every screen,
  // with compact cards on phones and sideways scrolling for wide rows.
  const cls = triangle
    ? {
        rows: "mx-auto flex w-max flex-col items-center gap-1.5 md:gap-3",
        heading: "hidden",
        row: "flex justify-center gap-1.5 md:gap-3",
        card: "w-[5.5rem] px-1.5 pt-2 pb-2 sm:w-28 md:w-36 md:px-2.5 md:pt-3 md:pb-3 lg:w-40",
        rank: "h-5 min-w-5 px-1 text-[10px] md:h-6 md:min-w-6 md:px-1.5 md:text-[11px]",
        name: "text-xs md:text-sm",
        itn: "text-[10px] leading-tight md:text-xs",
        self: "top-1 right-1.5 text-[9px] md:top-2 md:right-2 md:text-[10px]",
        button: "min-h-8 px-1 text-xs md:min-h-8",
      }
    : {
        rows: "flex flex-col gap-6 md:mx-auto md:w-max md:items-center md:gap-3",
        heading: "md:hidden",
        row: "grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:justify-center md:gap-3",
        card: "px-2.5 pt-3 pb-3 md:w-36 lg:w-40",
        rank: "h-6 min-w-6 px-1.5 text-[11px]",
        name: "text-sm",
        itn: "text-xs",
        self: "top-2 right-2 text-[10px]",
        button: "",
      };

  return (
    <PyramidScroller className="relative -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
      <div className={cls.rows}>
        {byRow.map((row, i) => (
          <div key={i} className="w-full md:w-auto">
            <h3
              className={`mb-2 flex items-center gap-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400 ${cls.heading}`}
            >
              Reihe {i + 1}
              <span className="h-px flex-1 bg-line" />
            </h3>
            <div className={cls.row}>
              {row.map((entry) => {
                const isSelf = entry.memberId === viewerMemberId;
                const canChallenge = !isSelf && eligibleMemberIds?.has(entry.memberId);
                const rank = rankOf({ row: entry.row, slot: entry.slot });
                return (
                  <div
                    key={entry.memberId}
                    data-self={isSelf || undefined}
                    className={
                      `relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border text-center shadow-sm transition-shadow ${cls.card} ` +
                      (isSelf
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-950"
                        : canChallenge
                          ? "border-brand-200 bg-surface hover:shadow-md dark:border-brand-900"
                          : "border-line bg-surface")
                    }
                  >
                    <span
                      className={
                        `inline-flex items-center justify-center rounded-full font-bold tabular-nums ${cls.rank} ` +
                        (rank === 1
                          ? "bg-ball text-zinc-900"
                          : isSelf
                            ? "bg-brand-600 text-white"
                            : "bg-surface-muted text-zinc-500 dark:text-zinc-400")
                      }
                    >
                      {rank}
                    </span>
                    {entry.quota && (
                      <span
                        title={quotaTitle(entry.quota)}
                        aria-label={quotaTitle(entry.quota)}
                        className={
                          "absolute top-1.5 left-1.5 " +
                          (entry.quota.state === "overdue"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400")
                        }
                      >
                        <HourglassIcon className="h-4 w-4" />
                      </span>
                    )}
                    {isSelf && (
                      <span
                        className={`absolute font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300 ${cls.self}`}
                      >
                        Du
                      </span>
                    )}
                    <span
                      className={`w-full leading-snug font-medium break-words text-zinc-900 dark:text-zinc-50 ${cls.name}`}
                    >
                      {entry.firstName} {entry.lastName}
                    </span>
                    {entry.itn && entry.showItnPublicly && (
                      <span className={`text-zinc-500 tabular-nums dark:text-zinc-400 ${cls.itn}`}>
                        {formatItnBadge(entry.itn)}
                      </span>
                    )}
                    {canChallenge && seasonId && (
                      <form action={createChallengeAction} className="mt-auto w-full pt-1">
                        <input type="hidden" name="seasonId" value={seasonId} />
                        <input type="hidden" name="defenderId" value={entry.memberId} />
                        <button type="submit" className={`btn btn-primary btn-sm w-full ${cls.button}`}>
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
    </PyramidScroller>
  );
}
