import { getDivisionByKey, getActiveSeason } from "@/server/seasons";
import { listRecentResults } from "@/server/challenges";
import { DivisionTabs, EmptyState, PageHeader } from "@/components/ui";

function formatScore(sets: { gamesA: number; gamesB: number; tiebreakA: number | null; tiebreakB: number | null }[]) {
  return sets
    .map((s) =>
      s.gamesA === 0 && s.gamesB === 0 && s.tiebreakA !== null
        ? `[${s.tiebreakA}:${s.tiebreakB}]`
        : `${s.gamesA}:${s.gamesB}`,
    )
    .join(" ");
}

export default async function ResultsFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ bewerb?: string }>;
}) {
  const { bewerb } = await searchParams;
  const active: "herren" | "damen" = bewerb === "damen" ? "damen" : "herren";

  const division = await getDivisionByKey(active);
  const season = division ? await getActiveSeason(division.id) : null;
  const results = season ? await listRecentResults(season.id) : [];

  return (
    <div className="page max-w-2xl">
      <PageHeader center title="Ergebnisse" lead={season?.name} />

      <div className="mb-6 flex justify-center sm:mb-8">
        <DivisionTabs active={active} basePath="/ergebnisse" />
      </div>

      {results.length === 0 ? (
        <EmptyState>Noch keine Ergebnisse.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {results.map((c) => {
            const isWalkover = c.resolution?.startsWith("walkover");
            const winnerIsChallenger = isWalkover
              ? c.resolution === "walkover_challenger"
              : c.match?.winnerId === c.challengerId;
            const player = (won: boolean, p: { firstName: string; lastName: string }) => (
              <span
                className={
                  "flex items-center gap-2 truncate " +
                  (won
                    ? "font-semibold text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 dark:text-zinc-400")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "h-2 w-2 shrink-0 rounded-full " + (won ? "bg-brand-500" : "bg-transparent")
                  }
                />
                <span className="truncate">
                  {p.firstName} {p.lastName}
                </span>
              </span>
            );
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  {player(winnerIsChallenger, c.challenger)}
                  {player(!winnerIsChallenger, c.defender)}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  {isWalkover ? (
                    <span className="badge badge-warning">Walkover</span>
                  ) : (
                    <span className="font-mono text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                      {c.match ? formatScore(c.match.sets) : ""}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {c.resolvedAt && new Date(c.resolvedAt).toLocaleDateString("de-AT")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
