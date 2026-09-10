import { listClubMemberImports } from "@/server/club-members";
import { ImportForm } from "./ImportForm";

export default async function ClubMemberImportPage() {
  const imports = await listClubMemberImports();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Vereinsmitglieder-Import
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Lade die echte Mitgliederliste des Vereins hoch (z. B. Export aus
          der Platzreservierung). Neue Anmeldungen zur Pyramide werden gegen
          diese Liste geprüft — wer nicht draufsteht, wird nicht automatisch
          aufgenommen, sondern bleibt zur manuellen Prüfung offen.
        </p>
        <ImportForm />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Bisherige Importe
        </h2>
        {imports.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Noch kein Import.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {imports.map((imp) => (
              <li
                key={imp.id}
                className="flex justify-between rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span>{imp.fileName ?? "Eingefügte Tabelle"}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {imp.rowCount} Zeilen · {new Date(imp.importedAt).toLocaleString("de-AT")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
