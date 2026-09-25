import { getActiveSeason, getAllDivisions, getDivisionSettings } from "@/server/seasons";
import { divisionSettingsSchema } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./SettingsForm";
import { resetInactivityAction, resetSettingsAction } from "./actions";

export default async function SettingsAdminPage() {
  const divisions = await getAllDivisions();
  const entries = await Promise.all(
    divisions.map(async (division) => {
      const season = await getActiveSeason(division.id);
      // The running season's copy is what's actually in force; fall back to
      // the division default when nothing is running.
      const settings = season
        ? divisionSettingsSchema.parse(season.settings ?? {})
        : await getDivisionSettings(division.id);
      return { division, season, settings };
    }),
  );

  return (
    <div className="page max-w-2xl">
      <PageHeader
        eyebrow="Admin"
        title="Regeln & Einstellungen"
        lead="Fristen, Forderungsreichweite und Inaktivitätsregel je Bewerb. Bereits laufende Forderungen behalten ihre ursprünglichen Fristen."
      />

      <ul className="flex flex-col gap-6">
        {entries.map(({ division, season, settings }) => (
          <li key={division.id} className="card card-body">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {division.name}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {season ? (
                  <span className="badge badge-brand">{season.name}</span>
                ) : (
                  <span className="badge badge-neutral">Keine aktive Saison</span>
                )}
                {settings.challengesPaused && <span className="badge badge-warning">Pausiert</span>}
              </div>
            </div>

            <SettingsForm
              divisionId={division.id}
              divisionName={division.name}
              settings={settings}
              hasActiveSeason={!!season}
            />

            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap">
              <form action={resetSettingsAction}>
                <input type="hidden" name="divisionId" value={division.id} />
                <button type="submit" className="btn btn-secondary btn-sm w-full sm:w-auto">
                  Auf Standardwerte zurücksetzen
                </button>
              </form>
              {season && (
                <form action={resetInactivityAction}>
                  <input type="hidden" name="seasonId" value={season.id} />
                  <button type="submit" className="btn btn-secondary btn-sm w-full sm:w-auto">
                    Inaktivitätszähler zurücksetzen
                  </button>
                </form>
              )}
            </div>
            {season && settings.inactivityCountFrom && (
              <p className="hint mt-2">
                Inaktivität wird gezählt ab{" "}
                {settings.inactivityCountFrom.toLocaleDateString("de-AT")}.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
