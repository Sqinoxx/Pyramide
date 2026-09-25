import { listPendingMembers } from "@/server/members";
import { findClubMemberCandidates } from "@/server/club-members";
import { approveMemberAction } from "./actions";

const TIER_LABEL: Record<string, { text: string; className: string }> = {
  auto: { text: "Vereinsmitglied erkannt", className: "text-green-700 dark:text-green-400" },
  suggest: { text: "möglicher Treffer", className: "text-amber-700 dark:text-amber-400" },
  none: { text: "kein Treffer in der Mitgliederliste", className: "text-red-700 dark:text-red-400" },
};

export default async function PendingMembersPage() {
  const pending = await listPendingMembers();

  const withMatch = await Promise.all(
    pending.map(async (member) => ({
      member,
      match: await findClubMemberCandidates({
        lastName: member.lastName,
        firstName: member.firstName,
        birthYear: member.birthYear,
        gender: member.gender,
        club: null,
      }),
    })),
  );

  return (
    <div className="page max-w-2xl">
      <h1 className="page-title">
        Wartende Anmeldungen
      </h1>
      <p className="page-lead mb-6">
        {pending.length === 0
          ? "Keine offenen Anmeldungen."
          : `${pending.length} Anmeldung(en) warten auf Freigabe.`}
      </p>

      <ul className="flex flex-col gap-3">
        {withMatch.map(({ member, match }) => {
          const tier = TIER_LABEL[match.tier];
          return (
            <li
              key={member.id}
              className="card card-body flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-sm break-words text-zinc-500 dark:text-zinc-400">
                  {member.user.email} · {member.division?.name ?? "kein Bewerb"} ·{" "}
                  {member.birthYear ?? "Jahrgang unbekannt"}
                  {member.club ? ` · ${member.club}` : ""}
                  {!member.user.emailVerifiedAt && " · E-Mail unbestätigt"}
                </p>
                <p className={`text-sm ${tier.className}`}>
                  {tier.text}
                  {match.candidates[0] &&
                    ` (${match.candidates[0].firstName} ${match.candidates[0].lastName}${
                      match.candidates[0].birthYear ? `, Jg. ${match.candidates[0].birthYear}` : ""
                    })`}
                </p>
              </div>
              <form action={approveMemberAction}>
                <input type="hidden" name="memberId" value={member.id} />
                <button type="submit" className="btn btn-primary w-full sm:w-auto">
                  Freischalten
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
