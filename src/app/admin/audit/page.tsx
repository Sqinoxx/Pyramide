import { listAuditLog } from "@/server/audit";
import { EmptyState } from "@/components/ui";

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
    <div className="page max-w-3xl">
      <h1 className="page-title">
        Audit-Log
      </h1>
      <p className="page-lead mb-6">
        Die letzten 200 Admin-Aktionen.
      </p>

      {entries.length === 0 ? (
        <EmptyState>Noch keine Einträge.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                <th className="px-4 py-2.5 font-medium">Zeit</th>
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5 font-medium">Aktion</th>
                <th className="px-4 py-2.5 font-medium">Ziel</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                    {new Date(e.at).toLocaleString("de-AT")}
                  </td>
                  <td className="px-4 py-2.5">{e.actor?.email ?? "—"}</td>
                  <td className="px-4 py-2.5">{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {e.entity}/{e.entityId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
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
