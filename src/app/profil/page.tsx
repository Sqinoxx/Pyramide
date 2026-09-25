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
import { Notice } from "@/components/ui";

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
      <Notice>Zu diesem Konto existiert kein Mitgliedsprofil. Bitte wende dich an einen Admin.</Notice>
    );
  }

  const activeItn = await getActiveItnForMember(member.id);
  const hasConfirmedImport = activeItn?.source === "import";
  const match = hasConfirmedImport
    ? { tier: "none" as const, candidates: [] }
    : await findItnCandidatesForMember(member);

  const season = member.divisionId ? await getActiveSeason(member.divisionId) : null;
  const stats = season ? await getMemberStats(season.id, member.id) : null;

  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="page max-w-2xl">
      <div className="mb-6 flex items-center gap-4 sm:mb-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-semibold text-white sm:h-16 sm:w-16 sm:text-xl dark:bg-brand-500 dark:text-brand-950">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="page-title truncate">
            {member.firstName} {member.lastName}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {member.division?.name ?? "Kein Bewerb"} · {STATUS_LABEL[member.status]}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-5">
        {member.status === "pending" && (
          <div className="alert alert-warning">
            Deine Registrierung wartet auf Freigabe durch einen Admin. Sobald du
            freigeschaltet bist, wirst du in die Pyramide aufgenommen.
          </div>
        )}

        {match.candidates.length > 0 && (
          <section className="alert alert-info">
            <h2 className="mb-2 font-semibold">Bist du das?</h2>
            <ul className="flex flex-col gap-2">
              {match.candidates.map((c) => (
                <li
                  key={c.itnRecordId}
                  className="flex flex-col gap-3 rounded-xl bg-surface px-3 py-3 text-sm text-zinc-800 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-200"
                >
                  <span>
                    <strong className="font-medium">
                      {c.firstName} {c.lastName}
                    </strong>
                    <span className="block text-zinc-500 dark:text-zinc-400">
                      Jg. {c.birthYear ?? "?"} · {c.club ?? "kein Verein"} · ITN {c.itn.toFixed(1)}
                    </span>
                  </span>
                  <span className="grid grid-cols-2 gap-2 sm:flex">
                    <form action={confirmOwnItnMatchAction}>
                      <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                      <button type="submit" className="btn btn-primary btn-sm w-full">
                        Das bin ich
                      </button>
                    </form>
                    <form action={dismissOwnItnMatchAction}>
                      <input type="hidden" name="itnRecordId" value={c.itnRecordId} />
                      <button type="submit" className="btn btn-secondary btn-sm w-full">
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
          <section className="card card-body">
            <h2 className="section-title">Statistik</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Siege" value={stats.wins} />
              <Stat label="Niederlagen" value={stats.losses} />
              <Stat
                label={
                  stats.currentStreak?.type === "loss" ? "Niederlagen in Serie" : "Siege in Serie"
                }
                value={stats.currentStreak?.count ?? 0}
              />
              <Stat
                label="Bestplatzierung"
                value={stats.bestRow ? `Reihe ${stats.bestRow}` : "—"}
              />
            </dl>
          </section>
        )}

        <section className="card card-body">
          <h2 className="section-title">ITN</h2>
          <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
            {activeItn ? (
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {formatItnBadge(activeItn)}
              </span>
            ) : (
              "Noch keine ITN hinterlegt."
            )}
            {activeItn?.mismatchWithSelf && (
              <span className="mt-1 block text-amber-700 dark:text-amber-400">
                Weicht deutlich von deiner eigenen Angabe ab.
              </span>
            )}
          </p>
          <SelfItnForm currentValue={activeItn?.source === "self" ? activeItn.value : null} />
        </section>

        <section className="card card-body">
          <h2 className="section-title">Profil</h2>
          <ProfileForm
            club={member.club}
            phone={member.phone}
            preferredTimes={member.preferredTimes}
            showItnPublicly={member.showItnPublicly}
          />
        </section>

        <section className="card card-body">
          <h2 className="section-title">Urlaubs-/Verletzungsmodus</h2>
          <LeaveForm onLeaveUntil={member.onLeaveUntil?.toISOString() ?? null} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-3">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}
