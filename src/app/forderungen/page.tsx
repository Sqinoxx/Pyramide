import Link from "next/link";
import { auth } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { getActiveSeason } from "@/server/seasons";
import { listChallengesForMember } from "@/server/challenges";
import { acceptChallengeAction, confirmResultAction, disputeResultAction } from "./actions";
import { DeclineForm } from "./DeclineForm";
import { ReportResultForm } from "./ReportResultForm";
import { EmptyState, Notice, PageHeader } from "@/components/ui";

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

const STATE_BADGE: Record<string, string> = {
  proposed: "badge-warning",
  accepted: "badge-brand",
  reported: "badge-warning",
  disputed: "badge-danger",
  expired_accept: "badge-danger",
  expired_play: "badge-danger",
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
    return <Notice>Kein Mitgliedsprofil gefunden.</Notice>;
  }

  const season = await getActiveSeason(member.divisionId);
  if (!season) {
    return <Notice>Für deinen Bewerb läuft noch keine Saison.</Notice>;
  }

  const all = await listChallengesForMember(season.id, member.id);
  const open = all.filter((c) => !["settled", "declined", "cancelled"].includes(c.state));
  const history = all.filter((c) => ["settled", "declined", "cancelled"].includes(c.state));

  return (
    <div className="page max-w-2xl">
      <PageHeader title="Meine Forderungen" lead={season.name} />

      {error && <p className="alert alert-error mb-6">{decodeURIComponent(error)}</p>}

      <section className="mb-10">
        <h2 className="section-title">Offen</h2>
        {open.length === 0 ? (
          <EmptyState>
            Keine offene Forderung.{" "}
            <Link href="/" className="link">
              Zur Pyramide
            </Link>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((c) => {
              const isChallenger = c.challengerId === member.id;
              const opponent = isChallenger ? c.defender : c.challenger;
              const reportedByOpponent = c.match && c.match.reportedBy !== member.id;

              return (
                <li key={c.id} className="card card-body">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {isChallenger ? "Du forderst" : "Du wirst gefordert von"}
                      </p>
                      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {opponent.firstName} {opponent.lastName}
                      </p>
                    </div>
                    <span className={`badge w-fit whitespace-normal ${STATE_BADGE[c.state] ?? "badge-neutral"}`}>
                      {STATE_LABEL[c.state] ?? c.state}
                    </span>
                  </div>

                  {c.state === "proposed" && !isChallenger && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <form action={acceptChallengeAction}>
                        <input type="hidden" name="challengeId" value={c.id} />
                        <button type="submit" className="btn btn-primary w-full sm:w-auto">
                          Annehmen
                        </button>
                      </form>
                      <DeclineForm challengeId={c.id} />
                    </div>
                  )}

                  {c.state === "proposed" && isChallenger && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Frist zur Annahme:{" "}
                      <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                        {new Date(c.acceptDeadline).toLocaleDateString("de-AT")}
                      </strong>
                    </p>
                  )}

                  {c.state === "accepted" && (
                    <>
                      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                        Frist zur Austragung:{" "}
                        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                          {c.playDeadline && new Date(c.playDeadline).toLocaleDateString("de-AT")}
                        </strong>
                      </p>
                      <ReportResultForm challengeId={c.id} />
                    </>
                  )}

                  {c.state === "reported" && reportedByOpponent && (
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <form action={confirmResultAction}>
                        <input type="hidden" name="challengeId" value={c.id} />
                        <button type="submit" className="btn btn-primary w-full">
                          Ergebnis bestätigen
                        </button>
                      </form>
                      <form action={disputeResultAction}>
                        <input type="hidden" name="challengeId" value={c.id} />
                        <button type="submit" className="btn btn-secondary w-full">
                          Bestreiten
                        </button>
                      </form>
                    </div>
                  )}

                  {c.state === "reported" && !reportedByOpponent && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Wartet auf Bestätigung durch {opponent.firstName}.
                    </p>
                  )}

                  {c.state === "disputed" && (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
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
          <h2 className="section-title">Verlauf</h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {history.map((c) => {
              const isChallenger = c.challengerId === member.id;
              const opponent = isChallenger ? c.defender : c.challenger;
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
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
