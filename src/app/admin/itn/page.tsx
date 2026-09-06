import { listMembersForItnReview } from "@/server/members";
import { findItnCandidatesForMember } from "@/server/itn-matching";
import { confirmMatchAction, dismissMatchAction } from "./actions";
import { AdminItnForm } from "./AdminItnForm";

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
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        ITN-Zuordnung
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Mitglieder ohne bestätigten offiziellen ITN-Treffer. Ein Treffer wird
        nie automatisch übernommen — bestätige ihn hier oder lehne ihn ab.
      </p>

      {withCandidates.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Alle Mitglieder haben einen bestätigten ITN-Wert oder es gibt keine
          offenen Kandidaten.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {withCandidates.map(({ member, division, match }) => (
          <li key={member.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-2 flex items-baseline justify-between">
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
                    className="flex items-center justify-between rounded bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
                  >
                    <span>
                      {c.firstName} {c.lastName} · Jg. {c.birthYear ?? "?"} ·{" "}
                      {c.club ?? "kein Verein"} · <strong>ITN {c.itn.toFixed(1)}</strong>{" "}
                      <span className="text-zinc-400">({Math.round(c.score * 100)}% Übereinstimmung)</span>
                    </span>
                    <span className="flex gap-2">
                      <form action={confirmMatchAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                        <button
                          type="submit"
                          className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Bestätigen
                        </button>
                      </form>
                      <form action={dismissMatchAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                        >
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
