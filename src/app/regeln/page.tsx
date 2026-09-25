import { DEFAULT_DIVISION_SETTINGS } from "@/lib/settings";

const s = DEFAULT_DIVISION_SETTINGS;

export default function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Regeln der Forderungspyramide
      </h1>

      <div className="flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">Einordnung</h2>
          <p>
            Herren und Damen spielen in getrennten Pyramiden. Zu Saisonbeginn
            werden alle freigeschalteten Mitglieder nach ihrer offiziellen
            OÖTV-ITN aufsteigend einsortiert (niedrigerer Wert = stärker);
            ohne ITN startet man unten. Wer später dazukommt, wird ebenfalls
            gleich anhand der ITN eingeordnet — direkt hinter dem
            letztplatzierten Spieler mit gleicher oder besserer ITN; alle
            dahinter rücken um einen Platz nach hinten. Ohne ITN startet man
            am Ende der Pyramide. Die ITN dient nur der Einordnung und wird
            in der Pyramide nicht angezeigt.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">Fordern</h2>
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

        <section>
          <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">Fristen</h2>
          <ul className="list-inside list-disc">
            <li>Annahme der Forderung: {s.acceptDeadlineDays} Tage</li>
            <li>Austragung nach Annahme: {s.playDeadlineDays} Tage</li>
            <li>Bestätigung des gemeldeten Ergebnisses: {s.reportConfirmDays} Tage</li>
          </ul>
          <p className="mt-2">
            Werden Fristen versäumt, kann das zu einem Sieg der Gegenseite am
            grünen Tisch (Walkover) führen — bei einer unbegründeten Absage
            ebenso.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">Ergebnis</h2>
          <p>
            Gespielt wird Best-of-3-Sätze; bei Satzgleichstand entscheidet ein
            Match-Tiebreak (bis 10) statt eines dritten Satzes. Gewinnt die
            fordernde Person, tauschen beide ihre Position; gewinnt die
            geforderte Person, bleibt alles wie es ist.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">Inaktivität</h2>
          <p>
            Wer {s.inactivityWeeks} Wochen ohne Match ist, bekommt eine
            Erinnerung; bleibt es dabei, rutscht man eine Position nach
            unten. Der Urlaubs-/Verletzungsmodus im Profil pausiert das.
          </p>
        </section>
      </div>
    </div>
  );
}
