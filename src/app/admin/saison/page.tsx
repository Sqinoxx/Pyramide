import { getAllDivisions, getActiveSeason, getPyramidView } from "@/server/seasons";
import { StartSeasonForm } from "./StartSeasonForm";
import { PositionSwapForm } from "./PositionSwapForm";

export default async function SeasonAdminPage() {
  const divisions = await getAllDivisions();
  const withSeason = await Promise.all(
    divisions.map(async (d) => ({
      division: d,
      season: await getActiveSeason(d.id),
      view: await getPyramidView(d.id),
    })),
  );

  return (
    <div className="page max-w-xl">
      <h1 className="page-title">
        Saisonverwaltung
      </h1>
      <p className="page-lead mb-6">
        Startet eine Pyramide mit allen aktuell freigeschalteten Mitgliedern,
        einsortiert nach ITN. Kann pro Bewerb nur einmal ausgeführt werden,
        solange keine Saison beendet wurde.
      </p>

      <ul className="flex flex-col gap-4">
        {withSeason.map(({ division, season, view }) => (
          <li key={division.id} className="card card-body">
            <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">{division.name}</p>
            {season ? (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Aktive Saison: <strong>{season.name}</strong> (seit{" "}
                  {new Date(season.startsAt).toLocaleDateString("de-AT")})
                </p>
                {view && view.rows.length >= 2 && (
                  <PositionSwapForm seasonId={season.id} members={view.rows} />
                )}
              </>
            ) : (
              <StartSeasonForm divisionId={division.id} divisionName={division.name} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
