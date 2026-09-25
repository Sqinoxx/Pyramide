import { listMembersForItnReview } from "@/server/members";
import { findItnCandidatesForMember } from "@/server/itn-matching";
import { confirmMatchAction, dismissMatchAction } from "./actions";
import { AdminItnForm } from "./AdminItnForm";
import { EmptyState } from "@/components/ui";

export default async function ItnReviewPage() {
  const rows = await listMembersForItnReview();

  const withCandidates = await Promise.all(
    rows.map(async ({ member, division }) => ({
      member,
      division,
      match: await findItnCandidatesForMember(member),
    })),
  );

  return (
    <div className="page max-w-3xl">
      <h1 className="page-title">
        ITN-Zuordnung
      </h1>
      <p className="page-lead mb-6">
        Mitglieder ohne bestätigten offiziellen ITN-Treffer. Ein Treffer wird
        nie automatisch übernommen — bestätige ihn hier oder lehne ihn ab.
      </p>

      {withCandidates.length === 0 && (
        <EmptyState>
          Alle Mitglieder haben einen bestätigten ITN-Wert oder es gibt keine
          offenen Kandidaten.
        </EmptyState>
      )}

      <ul className="flex flex-col gap-4">
        {withCandidates.map(({ member, division, match }) => (
          <li key={member.id} className="card card-body">
            <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {member.firstName} {member.lastName}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {division?.name} · {member.birthYear ?? "?"} · {member.club ?? "kein Verein"}
              </p>
            </div>

            {match.candidates.length === 0 ? (
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                Kein Kandidat in den importierten Listen gefunden.
              </p>
            ) : (
              <ul className="mb-3 flex flex-col gap-2">
                {match.candidates.map((c) => (
                  <li
                    key={c.itnRecordId}
                    className="flex flex-col gap-3 rounded-xl bg-surface-muted px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      {c.firstName} {c.lastName} · Jg. {c.birthYear ?? "?"} ·{" "}
                      {c.club ?? "kein Verein"} · <strong>ITN {c.itn.toFixed(1)}</strong>{" "}
                      <span className="text-zinc-400">({Math.round(c.score * 100)}% Übereinstimmung)</span>
                    </span>
                    <span className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                      <form action={confirmMatchAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                        <button type="submit" className="btn btn-primary btn-sm w-full">
                          Bestätigen
                        </button>
                      </form>
                      <form action={dismissMatchAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                        <button type="submit" className="btn btn-secondary btn-sm w-full">
                          Ablehnen
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <AdminItnForm memberId={member.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
