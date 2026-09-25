import Link from "next/link";
import {
  getAllDivisions,
  getActiveSeason,
  getPyramidView,
  listClosedSeasons,
} from "@/server/seasons";
import { StartSeasonForm } from "./StartSeasonForm";
import { PositionSwapForm } from "./PositionSwapForm";
import { endSeasonAction, renameSeasonAction } from "./actions";

const dateFmt = (d: Date) => new Date(d).toLocaleDateString("de-AT");

export default async function SeasonAdminPage() {
  const divisions = await getAllDivisions();
  const withSeason = await Promise.all(
    divisions.map(async (d) => ({
      division: d,
      season: await getActiveSeason(d.id),
      view: await getPyramidView(d.id),
      closed: await listClosedSeasons(d.id),
    })),
  );

  return (
    <div className="page max-w-xl">
      <h1 className="page-title">
        Saisonverwaltung
      </h1>
      <p className="page-lead mb-6">
        Startet eine Pyramide mit allen aktuell freigeschalteten Mitgliedern,
        einsortiert nach ITN. Pro Bewerb kann immer nur eine Saison aktiv
        sein – zum Neustart zuerst die laufende beenden. Die Regeln einer neuen
        Saison kommen aus den{" "}
        <Link href="/admin/einstellungen" className="link">
          Einstellungen
        </Link>
        .
      </p>

      <ul className="flex flex-col gap-4">
        {withSeason.map(({ division, season, view, closed }) => (
          <li key={division.id} className="card card-body">
            <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">{division.name}</p>
            {season ? (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Aktive Saison: <strong>{season.name}</strong> (seit {dateFmt(season.startsAt)}
                  {view ? `, ${view.rows.length} Spieler:innen` : ""})
                </p>
                {view && view.rows.length >= 2 && (
                  <PositionSwapForm seasonId={season.id} members={view.rows} />
                )}

                <details className="mt-4 border-t border-line pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Saison umbenennen oder beenden
                  </summary>
                  <form action={renameSeasonAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input type="hidden" name="seasonId" value={season.id} />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <label htmlFor={`rename-${season.id}`} className="label">
                        Neuer Name
                      </label>
                      <input
                        id={`rename-${season.id}`}
                        name="name"
                        defaultValue={season.name}
                        maxLength={100}
                        required
                        className="input"
                      />
                    </div>
                    <button type="submit" className="btn btn-secondary">
                      Umbenennen
                    </button>
                  </form>

                  <form action={endSeasonAction} className="alert alert-warning mt-4 flex flex-col gap-3">
                    <input type="hidden" name="seasonId" value={season.id} />
                    <p>
                      Beendet die Saison endgültig. Offene Forderungen werden ohne
                      Positionsänderung storniert; danach kann eine neue Saison
                      gestartet werden.
                    </p>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="confirm" required className="h-5 w-5 accent-brand-600" />
                      Ja, „{season.name}“ jetzt beenden
                    </label>
                    <button type="submit" className="btn btn-secondary self-start">
                      Saison beenden
                    </button>
                  </form>
                </details>
              </>
            ) : (
              <StartSeasonForm divisionId={division.id} divisionName={division.name} />
            )}
            {closed.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="section-title mb-1">Frühere Saisonen</p>
                <ul className="text-sm text-zinc-600 dark:text-zinc-400">
                  {closed.map((s) => (
                    <li key={s.id}>
                      {s.name} · {dateFmt(s.startsAt)}
                      {s.endsAt ? ` – ${dateFmt(s.endsAt)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
