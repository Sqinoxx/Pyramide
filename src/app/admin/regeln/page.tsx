import Link from "next/link";
import { getAllDivisions, getPyramidView } from "@/server/seasons";
import { divisionSettingsSchema } from "@/lib/settings";
import { rankOf } from "@/lib/pyramid";
import { HourglassIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { removeFromPyramidAction } from "./actions";

export default async function RuleSettingsPage() {
  const divisions = await getAllDivisions();
  const views = await Promise.all(
    divisions.map(async (d) => ({ division: d, view: await getPyramidView(d.id) })),
  );
  // The rule is configured per division (/admin/einstellungen).
  // Without a running season, show the default the next season will get.
  const ruleActive = views.map(({ division, view }) => ({
    division,
    settings: divisionSettingsSchema.parse((view ? view.season.settings : division.settings) ?? {}),
  }));
  const anyEnabled = ruleActive.some((r) => r.settings.minMatchesPerYear > 0);
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
      <h1 className="page-title">Mindestspiele</h1>
      <p className="page-lead mb-4">
        Das Jahr zählt ab dem Eintritt in die Pyramide. Die Sanduhr erscheint kurz vor
        Fristende und bleibt danach sichtbar, bis du die Person manuell entfernst. Rot =
        Frist abgelaufen. Anzahl und Vorwarnzeit stellst du je Bewerb unter{" "}
        <Link href="/admin/einstellungen" className="link">
          Regeln &amp; Einstellungen
        </Link>{" "}
        ein.
      </p>
      <ul className="mb-6 flex flex-wrap gap-1.5">
        {ruleActive.map(({ division, settings }) => (
          <li key={division.id} className="badge badge-neutral">
            {division.name}:{" "}
            {settings.minMatchesPerYear > 0
              ? `${settings.minMatchesPerYear} Spiele, Sanduhr ${settings.minMatchesWarningDays} Tage vorher`
              : "aus"}
          </li>
        ))}
      </ul>

      {!anyEnabled ? (
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
