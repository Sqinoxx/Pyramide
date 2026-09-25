import { listChallengesNeedingAdminAttention } from "@/server/challenges";
import { resolveDisputeAction } from "./actions";
import { EmptyState } from "@/components/ui";

const STATE_LABEL: Record<string, string> = {
  disputed: "Ergebnis strittig",
  expired_play: "Austragungsfrist abgelaufen, kein Ergebnis gemeldet",
};

export default async function DisputedChallengesPage() {
  const items = await listChallengesNeedingAdminAttention();

  return (
    <div className="page max-w-2xl">
      <h1 className="page-title">
        Strittige Forderungen
      </h1>
      <p className="page-lead mb-6">
        Entscheide, wer gewonnen hat — die Position wird entsprechend
        angepasst, sofern die fordernde Person gewinnt. Ohne Sieger wird die
        Forderung ohne Positionsänderung storniert.
      </p>

      {items.length === 0 ? (
        <EmptyState>Keine offenen Fälle.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((c) => (
            <li key={c.id} className="card card-body">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <form action={resolveDisputeAction}>
                  <input type="hidden" name="challengeId" value={c.id} />
                  <input type="hidden" name="winnerId" value={c.challengerId} />
                  <button
                    type="submit"
                    className="btn btn-primary w-full sm:w-auto"
                  >
                    {c.challenger.firstName} hat gewonnen
                  </button>
                </form>
                <form action={resolveDisputeAction}>
                  <input type="hidden" name="challengeId" value={c.id} />
                  <input type="hidden" name="winnerId" value={c.defenderId} />
                  <button
                    type="submit"
                    className="btn btn-primary w-full sm:w-auto"
                  >
                    {c.defender.firstName} hat gewonnen
                  </button>
                </form>
                <form action={resolveDisputeAction}>
                  <input type="hidden" name="challengeId" value={c.id} />
                  <button
                    type="submit"
                    className="btn btn-secondary w-full sm:w-auto"
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
