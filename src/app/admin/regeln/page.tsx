import { getAllDivisions, getPyramidView, getRuleSettings } from "@/server/seasons";
import { rankOf } from "@/lib/pyramid";
import { HourglassIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { RuleSettingsForm } from "./RuleSettingsForm";
import { removeFromPyramidAction } from "./actions";

export default async function RuleSettingsPage() {
  const [settings, divisions] = await Promise.all([getRuleSettings(), getAllDivisions()]);
  const views = await Promise.all(
    divisions.map(async (d) => ({ division: d, view: await getPyramidView(d.id) })),
  );
  const flagged = views.flatMap(({ division, view }) =>
    view
      ? view.rows
          .filter((r) => r.quota)
          .map((r) => ({ division, seasonId: view.season.id, row: r, quota: r.quota! }))
      : [],
  );
  flagged.sort((a, b) =>
    a.quota.state === b.quota.state
      ? a.quota.deadline.getTime() - b.quota.deadline.getTime()
      : a.quota.state === "overdue"
        ? -1
        : 1,
  );

  return (
    <div className="page max-w-2xl">
      <h1 className="page-title">Fristen & Mindestspiele</h1>
      <p className="page-lead mb-6">
        Gilt für alle Bewerbe: sofort für die laufende Saison und als Vorgabe für neue
        Saisonen. Bereits laufende Forderungen behalten ihre ursprünglichen Fristen.
      </p>

      <RuleSettingsForm settings={settings} />

      <h2 className="mt-10 mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Mindestspiele – Sanduhr
      </h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Das Jahr zählt ab dem Eintritt in die Pyramide. Die Sanduhr erscheint{" "}
        {settings.minMatchesWarningDays} Tage vor Fristende und bleibt danach sichtbar, bis du
        die Person manuell entfernst. Rot = Frist abgelaufen.
      </p>

      {settings.minMatchesPerYear <= 0 ? (
        <EmptyState>Die Mindestspiele-Regel ist deaktiviert.</EmptyState>
      ) : flagged.length === 0 ? (
        <EmptyState>Aktuell ist niemand betroffen.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {flagged.map(({ division, seasonId, row, quota }) => {
            const overdue = quota.state === "overdue";
            return (
              <li
                key={row.memberId}
                className="card card-body flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <HourglassIcon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${overdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {division.name} · Platz {rankOf(row)} · {quota.played}/{quota.required}{" "}
                      Spiele · {overdue ? "Frist abgelaufen am" : "Frist bis"}{" "}
                      {quota.deadline.toLocaleDateString("de-AT")}
                    </p>
                  </div>
                </div>
                {overdue && (
                  <form
                    action={removeFromPyramidAction}
                    className="flex flex-col gap-2 sm:items-end"
                  >
                    <input type="hidden" name="seasonId" value={seasonId} />
                    <input type="hidden" name="memberId" value={row.memberId} />
                    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <input type="checkbox" required /> Wirklich entfernen
                    </label>
                    <button type="submit" className="btn btn-danger w-full sm:w-auto">
                      Aus Pyramide entfernen
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
