import { listClubMemberImports } from "@/server/club-members";
import { ImportForm } from "./ImportForm";
import { EmptyState } from "@/components/ui";

export default async function ClubMemberImportPage() {
  const imports = await listClubMemberImports();

  return (
    <div className="page flex max-w-2xl flex-col gap-10">
      <div>
        <h1 className="page-title">
          Vereinsmitglieder-Import
        </h1>
        <p className="page-lead mb-6">
          Lade die echte Mitgliederliste des Vereins hoch (z. B. Export aus
          der Platzreservierung). Neue Anmeldungen zur Pyramide werden gegen
          diese Liste geprüft — wer nicht draufsteht, wird nicht automatisch
          aufgenommen, sondern bleibt zur manuellen Prüfung offen.
        </p>
        <div className="card card-body">
          <ImportForm />
        </div>
      </div>

      <div>
        <h2 className="section-title">
          Bisherige Importe
        </h2>
        {imports.length === 0 ? (
          <EmptyState>Noch kein Import.</EmptyState>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden text-sm">
            {imports.map((imp) => (
              <li
                key={imp.id}
                className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:justify-between"
              >
                <span className="font-medium break-all text-zinc-900 dark:text-zinc-100">
                  {imp.fileName ?? "Eingefügte Tabelle"}
                </span>
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
