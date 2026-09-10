import Link from "next/link";
import { getDivisionByKey, getActiveSeason } from "@/server/seasons";
import { listRecentResults } from "@/server/challenges";

const DIVISION_LABEL: Record<"herren" | "damen", string> = {
  herren: "Herren",
  damen: "Damen",
};

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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <h1 className="mb-6 text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Ergebnisse
      </h1>

      <div className="mb-8 flex justify-center gap-2">
        {(["herren", "damen"] as const).map((key) => (
          <Link
            key={key}
            href={`/ergebnisse?bewerb=${key}`}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (active === key
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700")
            }
          >
            {DIVISION_LABEL[key]}
          </Link>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Noch keine Ergebnisse.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((c) => {
            const isWalkover = c.resolution?.startsWith("walkover");
            const winnerIsChallenger = isWalkover
              ? c.resolution === "walkover_challenger"
              : c.match?.winnerId === c.challengerId;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
              >
                <span>
                  <strong className={winnerIsChallenger ? "" : "font-normal text-zinc-500"}>
                    {c.challenger.firstName} {c.challenger.lastName}
                  </strong>
                  {" – "}
                  <strong className={!winnerIsChallenger ? "" : "font-normal text-zinc-500"}>
                    {c.defender.firstName} {c.defender.lastName}
                  </strong>
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {isWalkover ? "Walkover" : c.match ? formatScore(c.match.sets) : ""}
                  {" · "}
                  {c.resolvedAt && new Date(c.resolvedAt).toLocaleDateString("de-AT")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
