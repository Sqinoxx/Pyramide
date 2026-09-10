import { auth } from "@/auth";
import { getMemberByUserId, listActiveMembers } from "@/server/members";
import { ContactForm } from "./ContactForm";

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
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Mitglieder
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Kontakt läuft über eine Nachricht in der App — Telefonnummern und
        E-Mail-Adressen bleiben privat.
      </p>

      <form className="mb-6" action="/mitglieder">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name oder Verein suchen…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </form>

      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {m.firstName} {m.lastName}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">
                {m.division?.name} {m.club ? `· ${m.club}` : ""}
              </p>
            </div>
            {self && self.id !== m.id && <ContactForm toMemberId={m.id} />}
          </li>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Keine Treffer.</p>
        )}
      </ul>
    </div>
  );
}
