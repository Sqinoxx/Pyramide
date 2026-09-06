import { auth } from "@/auth";
import { getActiveItnForMember, getMemberByUserId } from "@/server/members";
import { formatItnBadge } from "@/lib/itn-precedence";
import { ProfileForm } from "./ProfileForm";
import { SelfItnForm } from "./SelfItnForm";

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

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          ITN
        </h2>
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

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Profil
        </h2>
        <ProfileForm
          club={member.club}
          phone={member.phone}
          preferredTimes={member.preferredTimes}
          showItnPublicly={member.showItnPublicly}
        />
      </section>
    </div>
  );
}
