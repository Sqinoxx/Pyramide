import { listPendingMembers } from "@/server/members";
import { approveMemberAction } from "./actions";

export default async function PendingMembersPage() {
  const pending = await listPendingMembers();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Wartende Registrierungen
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {pending.length === 0
          ? "Keine offenen Registrierungen."
          : `${pending.length} Registrierung(en) warten auf Freigabe.`}
      </p>

      <ul className="flex flex-col gap-3">
        {pending.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {member.firstName} {member.lastName}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {member.user.email} · {member.division?.name ?? "kein Bewerb"} ·{" "}
                {member.birthYear ?? "Jahrgang unbekannt"}
                {member.club ? ` · ${member.club}` : ""}
                {!member.user.emailVerifiedAt && " · E-Mail unbestätigt"}
              </p>
            </div>
            <form action={approveMemberAction}>
              <input type="hidden" name="memberId" value={member.id} />
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Freischalten
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
