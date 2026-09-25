export default function PrivacyPolicyPage() {
  return (
    <div className="page max-w-2xl">
      <h1 className="page-title mb-4">
        Datenschutzerklärung
      </h1>
      <p className="alert alert-warning mb-6">
        <strong>Entwurf.</strong> Beschreibt korrekt, welche Daten diese App
        tatsächlich verarbeitet. Vor dem Livegang die mit [ ] markierten
        Stellen ausfüllen (Verantwortlicher, Hosting-/Mail-Anbieter) und
        idealerweise juristisch gegenprüfen lassen.
      </p>

      <div className="prose-page">
        <section className="card card-body">
          <h2>Verantwortlicher</h2>
          <p>
            [Vereinsname], [Adresse], [E-Mail] — siehe{" "}
            <a href="/impressum" className="link">
              Impressum
            </a>
            .
          </p>
        </section>

        <section className="card card-body">
          <h2>
            Welche Daten wir verarbeiten
          </h2>
          <ul>
            <li>
              Bei der Registrierung: Vor- und Nachname, E-Mail-Adresse,
              Passwort (gehasht, nie im Klartext gespeichert), Geburtsjahr,
              Geschlecht, optional Verein und Telefonnummer
            </li>
            <li>
              ITN-Wert (offiziell importiert von der OÖTV-Rangliste oder
              selbst angegeben) und Position in der Pyramide
            </li>
            <li>Forderungen, Matchergebnisse und Positionsverlauf</li>
            <li>
              Technische Daten beim Login (Zeitpunkt, zur Missbrauchsprävention
              temporär die IP-Adresse für das Rate-Limiting)
            </li>
          </ul>
        </section>

        <section className="card card-body">
          <h2>Zweck und Rechtsgrundlage</h2>
          <p>
            Die Verarbeitung dient der Organisation der vereinsinternen
            Tennis-Forderungspyramide (Art. 6 Abs. 1 lit. b DSGVO,
            Vertragserfüllung/Mitgliedschaft, bzw. lit. a bei Einwilligung
            für die öffentliche Anzeige von Name und ITN).
          </p>
        </section>

        <section className="card card-body">
          <h2>
            Öffentliche Sichtbarkeit
          </h2>
          <p>
            Name und Position in der Pyramide sind öffentlich einsehbar
            (ohne Login) — das ist Kernfunktion einer Forderungspyramide. Die
            ITN-Anzeige lässt sich im Profil individuell deaktivieren
            (&bdquo;ITN öffentlich anzeigen&ldquo;). Telefonnummer und E-Mail-Adresse
            werden nie öffentlich angezeigt; Kontakt zwischen Mitgliedern
            läuft über eine interne Nachrichtenfunktion.
          </p>
        </section>

        <section className="card card-body">
          <h2>Auftragsverarbeiter</h2>
          <p>
            Hosting: [Hosting-Anbieter/Serverstandort]. Mailversand: [SMTP-/
            E-Mail-Anbieter]. Mit beiden besteht ein Auftragsverarbeitungsvertrag
            nach Art. 28 DSGVO, sofern sie personenbezogene Daten verarbeiten.
          </p>
        </section>

        <section className="card card-body">
          <h2>Speicherdauer</h2>
          <p>
            Daten werden gespeichert, solange die Mitgliedschaft bzw. das
            Konto besteht. Backups werden nach 30 Tagen automatisch gelöscht
            (siehe <code>scripts/backup.sh</code>).
          </p>
        </section>

        <section className="card card-body">
          <h2>Deine Rechte</h2>
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit und
            Widerspruch (Art. 15–21 DSGVO) sowie das Recht auf Beschwerde bei
            der österreichischen Datenschutzbehörde (dsb.gv.at). Wende dich
            dafür an [Kontakt-E-Mail] oder einen Admin des Vereins.
          </p>
        </section>
      </div>
    </div>
  );
}
