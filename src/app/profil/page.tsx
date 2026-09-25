import { auth } from "@/auth";
import { getActiveItnForMember, getMemberByUserId } from "@/server/members";
import { findItnCandidatesForMember } from "@/server/itn-matching";
import { getActiveSeason } from "@/server/seasons";
import { getMemberStats } from "@/server/stats";
import { formatItnBadge } from "@/lib/itn-precedence";
import { ProfileForm } from "./ProfileForm";
import { SelfItnForm } from "./SelfItnForm";
import { LeaveForm } from "./LeaveForm";
import { confirmOwnItnMatchAction, dismissOwnItnMatchAction } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Warten auf Freigabe",
  active: "Aktiv",
  paused: "Pausiert",
  left: "Ausgetreten",
};

export default async function ProfilePage() {
  // proxy.ts already redirects unauthenticated requests to /login before
  // this ever renders, so the session is guaranteed here.
  const session = await auth();
  const member = await getMemberByUserId(session!.user.id);

  if (!member) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center text-zinc-600 dark:text-zinc-400">
        Zu diesem Konto existiert kein Mitgliedsprofil. Bitte wende dich an einen Admin.
      </div>
    );
  }

  const activeItn = await getActiveItnForMember(member.id);
  const hasConfirmedImport = activeItn?.source === "import";
  const match = hasConfirmedImport
    ? { tier: "none" as const, candidates: [] }
    : await findItnCandidatesForMember(member);

  const season = member.divisionId ? await getActiveSeason(member.divisionId) : null;
  const stats = season ? await getMemberStats(season.id, member.id) : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {member.firstName} {member.lastName}
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {member.division?.name ?? "Kein Bewerb"} · {STATUS_LABEL[member.status]}
      </p>

      {member.status === "pending" && (
        <div className="mb-8 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Deine Registrierung wartet auf Freigabe durch einen Admin. Sobald du
          freigeschaltet bist, wirst du in die Pyramide aufgenommen.
        </div>
      )}

      {match.candidates.length > 0 && (
        <section className="mb-8 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <h2 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
            Bist du das?
          </h2>
          <ul className="flex flex-col gap-2">
            {match.candidates.map((c) => (
              <li
                key={c.itnRecordId}
                className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm dark:bg-zinc-900"
              >
                <span>
                  {c.firstName} {c.lastName} · Jg. {c.birthYear ?? "?"} ·{" "}
                  {c.club ?? "kein Verein"} · ITN {c.itn.toFixed(1)}
                </span>
                <span className="flex gap-2">
                  <form action={confirmOwnItnMatchAction}>
                    <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                    <button
                      type="submit"
                      className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Das bin ich
                    </button>
                  </form>
                  <form action={dismissOwnItnMatchAction}>
                    <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                    >
                      Nicht ich
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Statistik
          </h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Bilanz: <strong>{stats.wins}</strong> Siege – <strong>{stats.losses}</strong> Niederlagen
            {stats.currentStreak && (
              <>
                {" · "}
                {stats.currentStreak.count}{" "}
                {stats.currentStreak.type === "win" ? "Siege" : "Niederlagen"} in Serie
              </>
            )}
            {stats.bestRow && <> · Bestplatzierung: Reihe {stats.bestRow}</>}
          </p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          ITN
        </h2>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Nur für dich sichtbar — wird ausschließlich für die Einordnung in
          die Pyramide verwendet.
        </p>
        <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
          {activeItn ? formatItnBadge(activeItn) : "Noch keine ITN hinterlegt."}
          {activeItn?.mismatchWithSelf && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              (weicht deutlich von deiner eigenen Angabe ab)
            </span>
          )}
        </p>
        <SelfItnForm currentValue={activeItn?.source === "self" ? activeItn.value : null} />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Profil
        </h2>
        <ProfileForm
          club={member.club}
          phone={member.phone}
          preferredTimes={member.preferredTimes}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Urlaubs-/Verletzungsmodus
        </h2>
        <LeaveForm onLeaveUntil={member.onLeaveUntil?.toISOString() ?? null} />
      </section>
    </div>
  );
}
