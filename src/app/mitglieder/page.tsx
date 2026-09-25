import { auth } from "@/auth";
import { getMemberByUserId, listActiveMembers } from "@/server/members";
import { ContactForm } from "./ContactForm";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function MembersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const self = await getMemberByUserId(session!.user.id);
  const members = await listActiveMembers(q);

  return (
    <div className="page max-w-2xl">
      <PageHeader
        title="Mitglieder"
        lead="Kontakt läuft über eine Nachricht in der App — Telefonnummern und E-Mail-Adressen bleiben privat."
      />

      <form className="mb-6" action="/mitglieder" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name oder Verein suchen…"
          aria-label="Mitglieder suchen"
          className="input"
        />
      </form>

      {members.length === 0 ? (
        <EmptyState>Keine Treffer.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  {m.firstName[0]}
                  {m.lastName[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="truncate text-zinc-500 dark:text-zinc-400">
                    {m.division?.name} {m.club ? `· ${m.club}` : ""}
                  </p>
                </div>
              </div>
              {self && self.id !== m.id && <ContactForm toMemberId={m.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
