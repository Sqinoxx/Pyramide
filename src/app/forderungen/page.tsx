import { auth } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { getActiveSeason } from "@/server/seasons";
import { listChallengesForMember } from "@/server/challenges";
import { acceptChallengeAction, confirmResultAction, disputeResultAction } from "./actions";
import { DeclineForm } from "./DeclineForm";
import { ReportResultForm } from "./ReportResultForm";

const STATE_LABEL: Record<string, string> = {
  proposed: "Wartet auf Annahme",
  accepted: "Angenommen — Termin ausmachen & spielen",
  reported: "Ergebnis gemeldet — wartet auf Bestätigung",
  disputed: "Strittig — Admin prüft",
  expired_accept: "Nicht rechtzeitig angenommen",
  expired_play: "Nicht rechtzeitig ausgetragen",
  declined: "Abgelehnt",
  cancelled: "Storniert",
  settled: "Abgeschlossen",
};

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const member = await getMemberByUserId(session!.user.id);

  if (!member || !member.divisionId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center text-zinc-600 dark:text-zinc-400">
        Kein Mitgliedsprofil gefunden.
      </div>
    );
  }

  const season = await getActiveSeason(member.divisionId);
  if (!season) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center text-zinc-600 dark:text-zinc-400">
        Für deinen Bewerb läuft noch keine Saison.
      </div>
    );
  }

  const all = await listChallengesForMember(season.id, member.id);
  const open = all.filter((c) => !["settled", "declined", "cancelled"].includes(c.state));
  const history = all.filter((c) => ["settled", "declined", "cancelled"].includes(c.state));

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Meine Forderungen
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{season.name}</p>

      {error && (
        <p className="mb-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {decodeURIComponent(error)}
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Offen
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Keine offene Forderung.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {open.map((c) => {
              const isChallenger = c.challengerId === member.id;
              const opponent = isChallenger ? c.defender : c.challenger;
              const reportedByOpponent = c.match && c.match.reportedBy !== member.id;

              return (
                <li key={c.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {isChallenger ? "Du forderst" : "Du wirst gefordert von"}{" "}
                      {opponent.firstName} {opponent.lastName}
                    </p>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {STATE_LABEL[c.state] ?? c.state}
                    </span>
                  </div>

                  {c.state === "proposed" && !isChallenger && (
                    <div className="flex gap-2">
                      <form action={acceptChallengeAction}>
                        <input type="hidden" name="challengeId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Annehmen
                        </button>
                      </form>
                      <DeclineForm challengeId={c.id} />
                    </div>
                  )}

                  {c.state === "proposed" && isChallenger && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Frist zur Annahme: {new Date(c.acceptDeadline).toLocaleDateString("de-AT")}
                    </p>
                  )}

                  {c.state === "accepted" && (
                    <>
                      <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Frist zur Austragung:{" "}
                        {c.playDeadline && new Date(c.playDeadline).toLocaleDateString("de-AT")}
                      </p>
                      <ReportResultForm challengeId={c.id} />
                    </>
                  )}

                  {c.state === "reported" && reportedByOpponent && (
                    <div className="flex gap-2">
                      <form action={confirmResultAction}>
                        <input type="hidden" name="challengeId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Ergebnis bestätigen
                        </button>
                      </form>
                      <form action={disputeResultAction}>
                        <input type="hidden" name="challengeId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                        >
                          Bestreiten
                        </button>
                      </form>
                    </div>
                  )}

                  {c.state === "reported" && !reportedByOpponent && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Wartet auf Bestätigung durch {opponent.firstName}.
                    </p>
                  )}

                  {c.state === "disputed" && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Ein Admin klärt diesen Fall.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Verlauf
          </h2>
          <ul className="flex flex-col gap-2">
            {history.map((c) => {
              const isChallenger = c.challengerId === member.id;
              const opponent = isChallenger ? c.defender : c.challenger;
              return (
                <li
                  key={c.id}
                  className="flex justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span>
                    {isChallenger ? "vs." : "gegen"} {opponent.firstName} {opponent.lastName}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {STATE_LABEL[c.state] ?? c.state}
                    {c.resolution === "walkover_challenger" || c.resolution === "walkover_defender"
                      ? " (Walkover)"
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
