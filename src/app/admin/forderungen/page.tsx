import { listChallengesNeedingAdminAttention } from "@/server/challenges";
import { resolveDisputeAction } from "./actions";

const STATE_LABEL: Record<string, string> = {
  disputed: "Ergebnis strittig",
  expired_play: "Austragungsfrist abgelaufen, kein Ergebnis gemeldet",
};

export default async function DisputedChallengesPage() {
  const items = await listChallengesNeedingAdminAttention();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Strittige Forderungen
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Entscheide, wer gewonnen hat — die Position wird entsprechend
        angepasst, sofern die fordernde Person gewinnt. Ohne Sieger wird die
        Forderung ohne Positionsänderung storniert.
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Keine offenen Fälle.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((c) => (
            <li key={c.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="mb-1 font-medium text-zinc-900 dark:text-zinc-50">
                {c.challenger.firstName} {c.challenger.lastName} vs. {c.defender.firstName}{" "}
                {c.defender.lastName}
              </p>
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                {c.season.division?.name} · {STATE_LABEL[c.state] ?? c.state}
                {c.match && (
                  <>
                    {" · "}
                    {c.match.sets
                      .map((s) =>
                        s.tiebreakA !== null && s.gamesA === 0 && s.gamesB === 0
                          ? `${s.tiebreakA}:${s.tiebreakB}`
                          : `${s.gamesA}:${s.gamesB}`,
                      )
                      .join(", ")}
                    {" · gemeldet von "}
                    {c.match.reportedBy === c.challengerId
                      ? c.challenger.firstName
                      : c.defender.firstName}
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={resolveDisputeAction}>
                  <input type="hidden" name="challengeId" value={c.id} />
                  <input type="hidden" name="winnerId" value={c.challengerId} />
                  <button
                    type="submit"
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {c.challenger.firstName} hat gewonnen
                  </button>
                </form>
                <form action={resolveDisputeAction}>
                  <input type="hidden" name="challengeId" value={c.id} />
                  <input type="hidden" name="winnerId" value={c.defenderId} />
                  <button
                    type="submit"
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {c.defender.firstName} hat gewonnen
                  </button>
                </form>
                <form action={resolveDisputeAction}>
                  <input type="hidden" name="challengeId" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                  >
                    Stornieren (kein Sieger)
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
