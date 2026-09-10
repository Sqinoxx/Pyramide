import { listAuditLog } from "@/server/audit";

const ACTION_LABEL: Record<string, string> = {
  approve_member: "Mitglied freigeschaltet",
  confirm_itn_match: "ITN-Treffer bestätigt",
  dismiss_itn_match: "ITN-Treffer abgelehnt",
  set_admin_itn: "ITN manuell gesetzt",
  import_itn: "ITN-Liste importiert",
  start_season: "Saison gestartet",
  resolve_dispute: "Streitfall entschieden",
  admin_move_position: "Position manuell geändert",
};

export default async function AuditLogPage() {
  const entries = await listAuditLog(200);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Audit-Log
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Die letzten 200 Admin-Aktionen.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Noch keine Einträge.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4 font-medium">Zeit</th>
                <th className="py-2 pr-4 font-medium">Admin</th>
                <th className="py-2 pr-4 font-medium">Aktion</th>
                <th className="py-2 pr-4 font-medium">Ziel</th>
                <th className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="whitespace-nowrap py-2 pr-4 text-zinc-500 dark:text-zinc-400">
                    {new Date(e.at).toLocaleString("de-AT")}
                  </td>
                  <td className="py-2 pr-4">{e.actor?.email ?? "—"}</td>
                  <td className="py-2 pr-4">{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {e.entity}/{e.entityId.slice(0, 8)}
                  </td>
                  <td className="py-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {e.after ? JSON.stringify(e.after) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
