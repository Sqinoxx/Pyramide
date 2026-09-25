export default function ImprintPage() {
  return (
    <div className="page max-w-2xl">
      <h1 className="page-title mb-4">Impressum</h1>
      <p className="alert alert-warning mb-6">
        <strong>Platzhalter.</strong> Diese Seite muss vor dem Livegang mit
        den echten Vereinsdaten befüllt werden (§ 5 ECG bzw. § 25 MedienG
        für Websites in Österreich). Die Felder unten in{" "}
        <code>src/app/impressum/page.tsx</code> eintragen.
      </p>

      <dl className="card card-body flex flex-col gap-4 text-sm text-zinc-700 dark:text-zinc-300">
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
            Medieninhaber / Diensteanbieter
          </dt>
          <dd>[Vereinsname], [Straße Nr.], [PLZ Ort], Österreich</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Vertretungsberechtigte(r)</dt>
          <dd>[Name der obmannschaftlich vertretungsbefugten Person]</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Kontakt</dt>
          <dd>
            E-Mail: [kontakt@verein.at]
            <br />
            Telefon: [optional]
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Vereinsregisterzahl</dt>
          <dd>[ZVR-Zahl]</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Zweck der Website</dt>
          <dd>
            Organisation der vereinsinternen Tennis-Forderungspyramide für
            Mitglieder von [Vereinsname].
          </dd>
        </div>
      </dl>
    </div>
  );
}
