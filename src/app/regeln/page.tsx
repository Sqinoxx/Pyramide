import { DEFAULT_DIVISION_SETTINGS, divisionSettingsSchema } from "@/lib/settings";
import { getActiveSeason, getDivisionByKey, getDivisionSettings } from "@/server/seasons";
import { DivisionTabs } from "@/components/ui";

/** The rules actually in force: the running season's, else the division default. */
async function loadSettings(key: "herren" | "damen") {
  const division = await getDivisionByKey(key);
  if (!division) return DEFAULT_DIVISION_SETTINGS;
  const season = await getActiveSeason(division.id);
  return season
    ? divisionSettingsSchema.parse(season.settings ?? {})
    : getDivisionSettings(division.id);
}

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ bewerb?: string }>;
}) {
  const { bewerb } = await searchParams;
  const active: "herren" | "damen" = bewerb === "damen" ? "damen" : "herren";
  const s = await loadSettings(active);

  return (
    <div className="page max-w-2xl">
      <h1 className="page-title mb-6">
        Regeln der Forderungspyramide
      </h1>

      <div className="mb-6">
        <DivisionTabs active={active} basePath="/regeln" />
      </div>

      {s.challengesPaused && (
        <p className="alert alert-warning mb-4">
          Forderungen sind derzeit pausiert – es können keine neuen Forderungen
          gestellt werden, und Inaktivität wird nicht gezählt.
        </p>
      )}

      <div className="prose-page">
        <section className="card card-body">
          <h2>Einordnung</h2>
          <p>
            Herren und Damen spielen in getrennten Pyramiden. Zu Saisonbeginn
            werden alle freigeschalteten Mitglieder nach ihrer offiziellen
            OÖTV-ITN aufsteigend einsortiert (niedrigerer Wert = stärker);
            ohne ITN startet man unten. Wer später dazukommt, startet
            grundsätzlich am Ende der Pyramide.
          </p>
        </section>

        <section className="card card-body">
          <h2>Fordern</h2>
          <p>
            Gefordert werden darf bis zu {s.challengeRowRange} Reihen nach
            oben{s.challengeSameRow ? ", sowie innerhalb der eigenen Reihe eine Position nach links" : ""}.
            Es ist immer nur eine offene Forderung gleichzeitig erlaubt —
            weder als fordernde noch als geforderte Person. Nach einem Match
            gilt eine Sperrfrist von {s.postMatchCooldownDays} Tagen, bevor
            man erneut gefordert werden kann; dieselbe Paarung darf sich erst
            nach {s.rematchCooldownDays} Tagen erneut duellieren.
          </p>
        </section>

        <section className="card card-body">
          <h2>Fristen</h2>
          <ul>
            <li>Annahme der Forderung: {s.acceptDeadlineDays} Tage</li>
            <li>Austragung nach Annahme: {s.playDeadlineDays} Tage</li>
            <li>Bestätigung des gemeldeten Ergebnisses: {s.reportConfirmDays} Tage</li>
          </ul>
          <p className="mt-2">
            Werden Fristen versäumt, kann das zu einem Sieg der Gegenseite am
            grünen Tisch (Walkover) führen
            {s.declineForfeit ? " — bei einer Absage ebenso" : ""}.
          </p>
        </section>

        <section className="card card-body">
          <h2>Ergebnis</h2>
          <p>
            Gespielt wird Best-of-3-Sätze; bei Satzgleichstand entscheidet ein
            Match-Tiebreak (bis 10) statt eines dritten Satzes. Gewinnt die
            fordernde Person, tauschen beide ihre Position; gewinnt die
            geforderte Person, bleibt alles wie es ist.
          </p>
        </section>

        <section className="card card-body">
          <h2>Inaktivität</h2>
          {s.inactivityEnabled ? (
            <p>
              Wer {s.inactivityWeeks} Wochen ohne Match ist, bekommt eine
              Erinnerung; bleibt es {s.inactivityGraceWeeks} weitere Woche(n)
              dabei, rutscht man eine Position nach unten. Der
              Urlaubs-/Verletzungsmodus im Profil pausiert das.
            </p>
          ) : (
            <p>Für diesen Bewerb gibt es derzeit keine Inaktivitätsregel.</p>
          )}
        </section>
      </div>
    </div>
  );
}
