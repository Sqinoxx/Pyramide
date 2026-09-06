import { getAllDivisions, getActiveSeason } from "@/server/seasons";
import { StartSeasonForm } from "./StartSeasonForm";

export default async function SeasonAdminPage() {
  const divisions = await getAllDivisions();
  const withSeason = await Promise.all(
    divisions.map(async (d) => ({ division: d, season: await getActiveSeason(d.id) })),
  );

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Saisonverwaltung
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Startet eine Pyramide mit allen aktuell freigeschalteten Mitgliedern,
        einsortiert nach ITN. Kann pro Bewerb nur einmal ausgeführt werden,
        solange keine Saison beendet wurde.
      </p>

      <ul className="flex flex-col gap-4">
        {withSeason.map(({ division, season }) => (
          <li key={division.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">{division.name}</p>
            {season ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Aktive Saison: <strong>{season.name}</strong> (seit{" "}
                {new Date(season.startsAt).toLocaleDateString("de-AT")})
              </p>
            ) : (
              <StartSeasonForm divisionId={division.id} divisionName={division.name} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
