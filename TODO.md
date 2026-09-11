# TODO

Laufende Aufgabenliste für dieses Projekt. Wird von Claude bei jedem
Arbeitsschritt aktualisiert (Häkchen setzen, neue Punkte ergänzen, Erledigtes
in den Verlauf verschieben).

## Offen

### Architektur / Migration zum Vereins-Login
- [ ] Später: ep-3-Login-Integration (echte Zugangsdaten der Platzreservierung
      statt Magic-Link) — bewusst zurückgestellt, Architektur ist als
      zusätzlicher `Credentials`-Provider vorbereitet (`src/auth.ts`).
- [ ] Echte SMTP-Zugangsdaten für den Produktivbetrieb eintragen
      (`.env` hat aktuell nur den Platzhalter `smtp.example.com`); SPF/DKIM
      beim Mail-Provider einrichten, sonst landen Mails im Spam.

### Phase 7 (laut PLAN.md) — noch offen
- [ ] E2E-Tests mit Playwright weiter ausbauen: bisher nur der eine
      Kern-Happy-Path (siehe Erledigt). Sinnvolle nächste Kandidaten:
      Forderung erstellen → annehmen → Ergebnis melden → Positionstausch;
      Walkover/Fristablauf; ITN-Import + Matching-Bestätigung.
- [ ] Off-site-Backup tatsächlich aktivieren: `BACKUP_OFFSITE_CMD` in `.env`
      auf ein echtes Ziel setzen (z. B. rclone-Remote); Hook existiert
      bereits in `scripts/backup.sh`, ist aber standardmäßig leer/inaktiv.

### Offene inhaltliche Punkte (aus PLAN.md Abschnitt 13)
- [ ] Vereinsname, Logo, Farben, Domain festlegen
- [ ] Start-Admin-Konto für den Produktivbetrieb anlegen
- [ ] Startgröße je Bewerb festlegen (Anzahl Reihen beim Seeding)
- [ ] Entscheiden: Bewerb mit wenigen Spieler:innen (z. B. Damen) als
      Pyramide oder vorerst als einfache Leiter
- [ ] Fristen (Annahme/Austragung/Bestätigung) nach erstem Testlauf
      feinjustieren
- [ ] Echte Impressumsdaten und Datenschutzerklärung des Vereins eintragen

## Erledigt

- [x] Phasen 0–6 (Scaffold, Auth/Profil, ITN-Import, Pyramide, Forderungen,
      Cronjobs, Statistik/Feed/Audit) — siehe Git-Historie
- [x] Phase 7 (teilweise): Rechtsseiten, Regelseite, HTML-Injection-Fix
- [x] Sechs Bugs behoben, die erst beim vollständigen Docker-Stack auffielen
- [x] Rang-Nummer (1, 2, 3, …) auf jeder Pyramiden-Karte anzeigen
- [x] Passwortloser Magic-Link-Login (zweiter `Credentials`-Provider neben
      Admin-Passwort-Login)
- [x] Admin-Import der echten Vereinsmitgliederliste (`club_members`,
      mirrored von der ITN-Import-Logik) mit Trigram-Matching
- [x] Beitritts-Flow (`/beitreten`) ersetzt die alte Passwort-Registrierung;
      Admin-Freigabe bleibt Pflicht, auch bei erkanntem Vereinsmitglied
- [x] Migration `0005_club_members_and_passwordless.sql` erstellt und auf
      die laufende Docker-DB angewendet
- [x] Build, Lint, Vitest (82 Tests) grün; kompletter Flow im Browser gegen
      den laufenden Docker-Stack verifiziert (Beitritt → Import →
      Match-Erkennung → Freischaltung → Pyramide)
- [x] Commit `f159ec9`
- [x] `PLAN.md` aktualisiert: passwortloser Magic-Link-Login und
      Admin-Import der Vereinsmitgliederliste dokumentiert (Abschnitt 3,
      Feature-Liste), Stand-Datum aktualisiert
- [x] Backup-Strategie: `scripts/backup.sh` (nächtlicher `pg_dump`, 30 Tage
      Retention) existierte schon; optionaler Off-site-Kopie-Hook
      (`BACKUP_OFFSITE_CMD`) ergänzt; echten Restore-Testlauf durchgeführt
      (Backup vom laufenden Docker-Stack gezogen, in einen isolierten
      Wegwerf-Postgres-Container restauriert, Zeilenzahlen von `users`,
      `members`, `positions`, `club_members` gegen die Live-DB verglichen —
      identisch)
- [x] Security-Review des letzten Commits (`f159ec9`, passwortloser
      Magic-Link-Login + Vereinsmitglieder-Import) per Sub-Agent-Analyse
      (Token-Handling, Admin-Autorisierung in jeder Server-Action, SQL-Injection
      im Trigram-Matching, Auto-Enrollment-Pfad): keine High-Confidence-Funde.
      Ein zweiter Sub-Agent behauptete eine vorbestehende Autorisierungslücke
      (`/admin/**`-Seiten prüfen die Rolle nicht selbst) — als Fehlalarm
      verifiziert: `src/proxy.ts` (Next.js 16's Umbenennung von
      `middleware.ts`, siehe `AGENTS.md`) schützt `/admin/:path*` bereits auf
      Routing-Ebene für nicht eingeloggte *und* nicht-Admin-Nutzer; per
      `curl` gegen den laufenden Docker-Stack bestätigt (Redirect zu
      `/login`).
- [x] Playwright-E2E-Infrastruktur aufgesetzt (`playwright.config.ts`, `e2e/`):
      eigener isolierter Stack (`docker-compose.e2e.yml`, Postgres auf Port
      5435 + Maildev auf 1081/1026) statt der laufenden Dev-Instanz, eigener
      `next dev` auf Port 3100. `e2e/run-web-server.mjs` macht Docker-Up +
      Migrate + Seed synchron *im selben Prozess* wie den Server-Start, weil
      Playwright `webServer` und `globalSetup` parallel statt nacheinander
      startet (per Filesystem-Marker verifiziert — ein separates
      `globalSetup` lief nie vor dem ersten DB-Query des Servers).
      `e2e/helpers/mail.ts` liest echte Mails über Maildevs REST-API aus
      (kein DB-Shortcut zum Roh-Token, der wird laut `src/server/tokens.ts`
      absichtlich nie gespeichert). Zwei Specs: `smoke.spec.ts`
      (Pyramiden-Ansicht, Rechtsseiten) und `join-flow.spec.ts` (kompletter
      Happy Path: Beitritt → Bestätigungsmail → Admin-Freigabe →
      Login-Link-Anmeldung → Mitglied erscheint in der Damen-Pyramide).
      Dabei einen echten Bug gefunden und behoben: `LoginForm.tsx`s
      Admin-Passwort-Formular teilte sich `id="email"`/`id="password"` mit
      dem Magic-Link-Formular auf derselben Seite (ungültiges HTML, kaputte
      Label-Zuordnung) — `Field`-Komponente (`src/components/form.tsx`) um
      optionale `id`-Prop erweitert, Admin-Formular nutzt jetzt
      `id="admin-email"`/`id="admin-password"`.
      `npm run test:e2e` grün (4/4), `npm run lint`, `npm test` (82) und
      `npm run build` weiterhin grün.
