# Tennis-Forderungspyramide — Projektplan

Stand: 2026-09-06

**Festgelegte Rahmenentscheidungen**
- Forderung bis **2 Reihen nach oben**, Sieg = **Positionstausch (Swap)**
- ITN: **Admin-Import der offiziellen OÖTV-Liste** *und* **Selbsteintrag durch den
  Spieler** (siehe 5.4 zur Vorrangregel)
- Hosting: **Docker auf eigenem Server/VPS**
- **Zwei getrennte Pyramiden: Damen und Herren** (gemeinsame Mitglieder- und
  ITN-Verwaltung)

## 1. Ziel

Eine Web-App, auf der sich Vereinsmitglieder registrieren, automatisch in eine
Forderungspyramide eingeordnet werden und sich gegenseitig fordern, um
aufzusteigen. Die Ersteinordnung folgt der OÖTV-ITN-Spielstärke, sofern der
Name in den offiziellen ITN-Listen gefunden wird.

Nicht-Ziele (bewusst ausgeklammert): Platzbuchung, Mitgliedsbeiträge/Zahlungen,
Turnierverwaltung. Beides kann später angedockt werden.

---

## 2. Tech-Stack (Empfehlung)

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Ein Repo für Frontend + API, SSR für schnelle mobile Ansicht, großes Ökosystem |
| DB | **PostgreSQL 16** | Transaktionen + Constraints sind für die Pyramidenlogik zwingend |
| ORM | **Drizzle ORM** + drizzle-kit Migrationen | typsicher, nah an SQL (wichtig für Positions-Updates in einer Transaktion) |
| Auth | **Auth.js v5** (Credentials, JWT-Session) | E-Mail-Verifikation, Passwort-Reset und Rate-Limiting sind eigene, schlanke Implementierungen auf `users`/`verification_tokens` — Auth.js' Adapter-/Email-Provider-Mechanik ist auf OAuth-Account-Linking zugeschnitten und passt hier nicht |
| UI | **Tailwind CSS + shadcn/ui** | schnelles, sauberes, mobile-first UI |
| Validierung | **Zod** (geteilt Client/Server) + react-hook-form | eine Wahrheit für Formulare und API |
| E-Mail | **Resend** oder SMTP (nodemailer) + React Email | Transaktionsmails, Templates versioniert im Repo |
| Jobs | Cron (Vercel Cron bzw. Container mit node-cron) | Fristen, Erinnerungen, Inaktivitäts-Check |
| Tests | **Vitest** (Unit) + **Playwright** (E2E) | Pyramidenlogik + Statemachine müssen testgedeckt sein |
| Deployment | **Docker Compose** (app + postgres + Caddy) oder Vercel + Neon | Docker ist lokal bereits vorhanden |
| Sprache | Deutsch (i18n-fähig, EN nachrüstbar) | Zielgruppe |

Alternative, falls Python bevorzugt wird: FastAPI + SQLModel + HTMX. Der Plan
bleibt inhaltlich identisch; ich empfehle den TS-Stack wegen des einheitlichen
Typmodells über die API-Grenze hinweg.

---

## 3. Rollen

- **Gast** — sieht öffentliche Pyramide, Regeln, Ergebnisfeed (Namen ggf. gekürzt).
- **Mitglied** — Profil, fordern, Termine, Ergebnisse melden/bestätigen, Statistik.
- **Admin** — Freischaltung neuer Mitglieder, Regelparameter, ITN-Import,
  Streitfälle, manuelle Korrektur, Saisonstart/-ende, Audit-Log.

### Nutzerreise Registrierung
1. Registrierung (E-Mail, Passwort, Vor-/Nachname, Geburtsjahr, Geschlecht, Verein).
2. E-Mail-Verifikation.
3. **ITN-Abgleich**: System sucht Kandidaten in der importierten OÖTV-Liste
   → Nutzer bestätigt "das bin ich" oder wählt "kein Eintrag / ohne ITN".
4. Admin-Freigabe (Vereinszugehörigkeit prüfen) — abschaltbar.
5. **Einordnung** in die Pyramide (siehe 5.3) → Willkommensmail mit Startposition.

---

## 4. Pyramiden- & Forderungslogik

### 4.1 Struktur
- Es gibt **zwei Bewerbe (Divisions): Damen und Herren**, jeweils mit eigener
  Pyramide, eigener Saison und eigenen Regelparametern. Mitgliederverwaltung,
  Login und ITN-Import sind gemeinsam. Forderungen über Bewerbsgrenzen hinweg
  sind nicht möglich (DB-Constraint).
- Die Zuordnung erfolgt aus dem Geschlecht im Profil, ist aber vom Admin
  überschreibbar (Mitglied kann in genau einem Bewerb aktiv sein).
- Die öffentliche Ansicht zeigt beide Pyramiden über einen Umschalter; die
  Startseite merkt sich die zuletzt gewählte Ansicht.
- Reihe `r` hat `r` Plätze (Reihe 1 = Spitze, 1 Platz). Position = `(reihe, platz)`.
- Innerhalb einer Reihe sind Plätze gleichwertig, aber ordinal sortiert
  (links = besser) — wichtig für die Reihenfolge beim Auffüllen.
- Jede Position ist pro Saison eindeutig (DB-Unique-Constraint).
- Neue Mitglieder füllen freie Plätze von oben links nach unten rechts auf;
  ist die Pyramide voll, wächst eine neue unterste Reihe.

### 4.2 Forderungsregeln (Werte je Bewerb in den Admin-Settings konfigurierbar)

| Parameter | Default | Bedeutung |
|---|---|---|
| `challengeRowRange` | **2** (festgelegt) | Wie viele Reihen nach oben gefordert werden darf |
| `challengeSameRow` | true | Fordern innerhalb der eigenen Reihe (nur nach links) erlaubt |
| `acceptDeadlineDays` | 7 | Frist zur Annahme der Forderung |
| `playDeadlineDays` | 21 | Frist zur Austragung nach Annahme |
| `reportConfirmDays` | 3 | Frist für Bestätigung des gemeldeten Ergebnisses (danach Auto-Bestätigung) |
| `maxOpenOutgoing` / `maxOpenIncoming` | 1 / 1 | Offene Forderungen pro Spieler |
| `rematchCooldownDays` | 14 | Sperre für dieselbe Paarung |
| `postMatchCooldownDays` | 3 | Schonfrist nach einem Match |
| `inactivityWeeks` | 8 | Ohne Match → automatisch eine Reihe nach unten |
| `declineForfeit` | true | Unbegründete Ablehnung = Niederlage am grünen Tisch |
| `matchFormat` | Best of 3, 3. Satz = Match-Tiebreak | Grundlage der Ergebnisvalidierung |

### 4.3 Positionswechsel
- **Herausforderer gewinnt** → **Positionstausch (Swap)** — so festgelegt.
  (Die Engine bleibt so gebaut, dass eine "Insertion"-Variante später als
  Option ergänzt werden könnte, ohne die Datenstruktur zu ändern.)
- **Verteidiger gewinnt** → keine Änderung, beide bekommen Cooldown.
- **Walkover / Fristablauf / unbegründete Ablehnung** → Swap zugunsten des
  nicht-säumigen Spielers, Match als `walkover` protokolliert.
- Jeder Wechsel schreibt einen unveränderlichen Eintrag in `position_history`
  (wer, von, nach, Grund, Match-Referenz) und läuft in **einer DB-Transaktion**
  mit Zeilensperren auf den betroffenen Positionen.

### 4.4 Zustandsautomat einer Forderung

```
PROPOSED ──accept──▶ ACCEPTED ──report──▶ REPORTED ──confirm──▶ SETTLED
   │  │                  │                    │
   │  │                  │                    └─dispute─▶ DISPUTED ─admin─▶ SETTLED
   │  │                  └─play-deadline──▶ EXPIRED_PLAY ─▶ SETTLED (Walkover)
   │  └─decline──▶ DECLINED ─▶ SETTLED (Walkover) | CANCELLED (mit gültigem Grund)
   └─accept-deadline──▶ EXPIRED_ACCEPT ─▶ SETTLED (Walkover)
```

Übergänge ausschließlich serverseitig, jeder Übergang auditiert.

### 4.5 Sonderzustände
- **Abwesenheit/Verletzung** ("Urlaubsmodus"): nicht forderbar, kann selbst auch
  nicht fordern; max. Tage pro Saison begrenzt; zählt nicht als Inaktivität.
- **Saison**: Start-/Enddatum, Einfrieren, Endstand-Snapshot, neue Saison kann
  mit Endstand oder mit ITN-Neueinordnung starten.

---

## 5. ITN-Integration (OÖTV)

### 5.1 Rechtslage / Datenquelle
Es gibt **keine offizielle öffentliche API**. Der OÖTV veröffentlicht die
ITN-Ranglisten als durchsuchbare Tabelle und als **PDF-Download** je
Altersklasse/Geschlecht (ooetv.at/rangliste/itn); vollständige Spielerprofile
erfordern Login. Automatisiertes Massen-Scraping ist rechtlich heikel (AGB,
DSGVO) — deshalb:

**Gewählter Weg:** Admin lädt die offiziell veröffentlichte Rangliste
(PDF/CSV/Copy-Paste) im Adminbereich hoch → Parser → `itn_records`.
Zusätzlich kann **jeder Spieler seine ITN im Profil selbst eintragen**
(Dropdown 1.0 – 10.3, optional mit Lizenznummer und Stand-Datum).
Nachgelagert optional ein Scraper-Adapter, falls der Verein das freigibt.

Die Importschicht ist als **austauschbarer Adapter** gebaut
(Interface `ItnSource` mit `fetchRecords()`), damit PDF-Import, CSV-Import,
manuelle Eingabe und ein späterer Scraper dieselbe Zielstruktur bedienen.

### 5.2 Namens-Matching
- Normalisierung: Umlaute, Diakritika, Groß-/Kleinschreibung, Titel, Bindestriche.
- Kandidatensuche via PostgreSQL `pg_trgm` (Trigramm-Ähnlichkeit) auf
  "Nachname, Vorname".
- Score = Namensähnlichkeit + Bonus für übereinstimmendes **Geburtsjahr**,
  **Verein** und **Geschlecht**.
- Ergebnis: `auto` (Score ≥ 0.92 und eindeutig), `suggest` (Liste zur Auswahl),
  `none`. **Nie stillschweigend zuordnen** — der Nutzer bestätigt, Admin kann
  überschreiben.
- Verknüpfung wird gespeichert, damit spätere Importe den ITN-Wert automatisch
  aktualisieren (mit Historie).

### 5.3 Ersteinordnung ("Seeding")
- Seeding läuft **je Bewerb getrennt** (Damen und Herren jeweils eigenständig).
- Sortierung aller Gründungsmitglieder nach ITN aufsteigend (1.0 = stärkste,
  10.3 = Anfänger), Tiebreak: manueller Admin-Rang, dann Zufall mit fixem Seed.
- Verteilung reihenweise: Platz 1 → Reihe 1, Plätze 2–3 → Reihe 2, usw.
- Mitglieder **ohne** ITN: Admin setzt eine Schätzung oder sie starten unten.
- Später Beitretende: standardmäßig **unterste Reihe** (klassische Ladder-Regel,
  verhindert das "Einkaufen" guter Positionen). Optionaler Modus
  "ITN-Einstieg": Einstieg in die zur ITN passende Reihe auf dem letzten Platz.
- Der ITN-Wert wird im Profil und in der Pyramide als Badge angezeigt (mit
  Stand-Datum und Quelle) — er beeinflusst nach dem Seeding nichts mehr.

### 5.4 Vorrang der ITN-Quellen
Jedes Mitglied kann bis zu drei ITN-Angaben haben. Angezeigt und fürs Seeding
verwendet wird immer die höchstwertige verfügbare Quelle:

| Rang | Quelle | Badge | Bearbeitbar von |
|---|---|---|---|
| 1 | Bestätigter Treffer im offiziellen Import | „ITN 4.5 · OÖTV, Stand 03/2026" | Import / Admin |
| 2 | Vom Admin gesetzter Wert | „ITN 4.5 · vom Verein bestätigt" | Admin |
| 3 | Selbsteintrag des Spielers | „ITN 4.5 · eigene Angabe" (grau/kursiv) | Mitglied |

Regeln dazu:
- Ein Selbsteintrag wird **nie** überschrieben, sondern nur überlagert — kommt
  später ein offizieller Treffer, bleibt die Eigenangabe zur Nachvollziehbarkeit
  in der Historie erhalten.
- Weicht der Selbsteintrag um mehr als eine ITN-Stufe vom offiziellen Wert ab,
  bekommt der Admin einen Hinweis im Dashboard.
- Selbsteinträge sind als solche gekennzeichnet, damit beim Seeding und in der
  Pyramide erkennbar ist, worauf die Einordnung beruht.
- Änderungen am eigenen ITN-Wert sind nach Saisonstart nur noch mit
  Admin-Freigabe wirksam (verhindert nachträgliche Manipulation).

---

## 6. Datenmodell (Kern)

```
users(id, email, password_hash, email_verified_at, role, created_at, ...)
sessions / verification_tokens                      -- Auth.js

members(id, user_id, first_name, last_name, birth_year, gender, club,
        division_id, phone, avatar_url, status[pending|active|paused|left],
        joined_at, preferred_times, notes)

divisions(id, key[damen|herren], name, settings_json)

itn_imports(id, source, file_name, imported_by, imported_at, row_count)
itn_records(id, import_id, last_name, first_name, birth_year, gender, club,
            region, licence_no, itn, points, normalized_name, valid_from)
itn_links(member_id, itn_record_id, confidence, confirmed_by, confirmed_at)
member_itn(id, member_id, value, source[import|admin|self], licence_no?,
           as_of, created_by, created_at, superseded_at?)
        -- append-only; der aktive Wert ergibt sich aus der Vorrangregel 5.4

seasons(id, division_id, name, starts_at, ends_at, status[draft|active|closed],
        settings_json)
positions(id, season_id, member_id, row, slot, since,
          UNIQUE(season_id, row, slot), UNIQUE(season_id, member_id))
position_history(id, season_id, member_id, from_row, from_slot, to_row, to_slot,
                 reason[seed|challenge_win|swap_loss|inactivity|admin|insert],
                 challenge_id?, created_at)

challenges(id, season_id, challenger_id, defender_id, state, proposed_at,
           accept_deadline, accepted_at, play_deadline, scheduled_at, court,
           resolved_at, resolution[played|walkover_*|cancelled], match_id?)
matches(id, challenge_id, played_at, winner_id, retired, walkover, reported_by,
        confirmed_by, confirmed_at)
match_sets(match_id, set_no, games_a, games_b, tiebreak_a?, tiebreak_b?)

availability(member_id, weekday, from, to)          -- Terminfindung
notifications(id, member_id, type, payload, read_at, created_at)
announcements(id, title, body_md, published_at, author_id)
settings(key, value_json)                           -- Regelparameter
audit_log(id, actor_id, action, entity, entity_id, before, after, at)
```

Wichtige Invarianten als DB-Constraints, nicht nur im Code:
Positions-Eindeutigkeit, `challenger != defender`, beide Spieler einer Forderung
in derselben Saison/​demselben Bewerb, max. 1 aktive Forderung je Spieler
(Partial Unique Index auf offenen States), Satzergebnis-Check,
höchstens ein nicht abgelöster `member_itn`-Eintrag je Quelle und Mitglied.

---

## 7. Featureliste

### MVP (spielbar)
- Registrierung, E-Mail-Verifikation, Login, Passwort-Reset, Profil
- Admin-Freigabe von Mitgliedern, Zuordnung zum Bewerb Damen/Herren
- ITN-Import (CSV/PDF) + Matching + Bestätigung durch Nutzer
- ITN-Selbsteintrag im Profil inkl. Quellen-Kennzeichnung (5.4)
- Seeding beider Pyramiden, öffentliche Ansicht mit Umschalter
  Damen/Herren (mobil-optimiert)
- Forderung erstellen / annehmen / ablehnen, Terminvorschlag
- Ergebnis melden + bestätigen, automatischer Positionstausch
- E-Mail-Benachrichtigungen + In-App-Inbox
- Regelseite, Impressum, Datenschutz

### v1 (rund)
- Fristen-Cronjobs (Annahme, Austragung, Auto-Bestätigung, Inaktivität)
- Urlaubs-/Verletzungsmodus
- Streitfall + Admin-Schlichtung, manuelle Positionskorrektur
- Statistik: Bilanz, Serien, Head-to-Head, Positionsverlauf-Chart, Bestplatzierung
- Ergebnis-Feed + Match-Kalender, iCal-Feed
- Suche/Filter Mitgliederliste, Kontaktmöglichkeit ohne Preisgabe von Telefonnummern
- Vereinsnews/Ankündigungen
- Audit-Log, Saisonverwaltung inkl. Endstand-Snapshot
- PWA (installierbar, Push-Benachrichtigungen)

### Später
- Doppel-Pyramide / Team-Forderungen
- Automatische Terminvorschläge aus `availability`
- Mehrere Ligen/Gruppen parallel, Auf-/Abstieg zwischen Gruppen
- Anbindung Platzbuchung, WhatsApp/Telegram-Bot
- Mehrsprachigkeit EN

---

## 8. Automatisierte Jobs (täglich, idempotent)

1. Annahmefrist abgelaufen → Walkover für Herausforderer
2. Austragungsfrist abgelaufen → Walkover (Regel: wer nicht reagiert hat)
3. Ergebnis unbestätigt > `reportConfirmDays` → Auto-Bestätigung
4. Erinnerungen: 48 h vor Fristablauf, 24 h vor vereinbartem Termin
5. Inaktivität > `inactivityWeeks` → Warnung, danach Abstieg
6. Wöchentliche Zusammenfassung per Mail (opt-in)

---

## 9. Sicherheit, Datenschutz, Recht

- Passwörter mit **Argon2id**, Rate-Limiting auf Login/Registrierung/Reset
- Session-Cookies httpOnly/SameSite=Lax, CSRF-Schutz, Security-Header/CSP
- Rollenprüfung serverseitig bei **jeder** Mutation; kein Vertrauen ins Frontend
- DSGVO: Einwilligung zur Anzeige von Name/ITN in der öffentlichen Pyramide,
  Datenexport (JSON) und Löschung im Profil, Auftragsverarbeiter dokumentiert,
  Datensparsamkeit (Telefonnummer nur für den Forderungspartner sichtbar)
- **Impressum** (§ 5 ECG / § 25 MedienG) und Datenschutzerklärung sind in
  Österreich Pflicht
- ITN-Daten: nur offiziell veröffentlichte Werte, Quelle + Stand ausweisen,
  Widerspruchsmöglichkeit ("ITN nicht öffentlich anzeigen")
- Backups: nächtlicher `pg_dump`, 30 Tage Retention, Restore einmal testen

---

## 10. Qualitätssicherung

- **Unit-Tests** für die Regel-Engine: erlaubte Forderungen, Swap-Berechnung,
  Fristen, Walkover-Fälle, Seeding-Verteilung, Satzvalidierung
- **Property-Test**: nach beliebiger Folge von Matches bleibt die Pyramide
  konsistent (keine doppelte Position, keine Lücke oberhalb einer Besetzung)
- **E2E** (Playwright): Registrierung → Einordnung → Forderung → Ergebnis →
  Positionswechsel
- Seed-Skript mit ca. 40 Testmitgliedern und simulierter Saison
- CI: Lint, Typecheck, Tests, Migration-Dry-Run

---

## 11. Deployment & Betrieb — Docker auf eigenem Server/VPS

- `docker-compose.yml` mit vier Services:
  - `app` (Next.js, Multi-Stage-Build, non-root, Healthcheck)
  - `worker` (Cronjobs aus Abschnitt 8, getrennt von der App)
  - `postgres` (Volume + `pg_trgm`-Extension, nur intern erreichbar)
  - `caddy` (Reverse Proxy, automatisches Let's-Encrypt-TLS)
- `.env.example` mit allen Variablen, Migrationen laufen beim Containerstart
- Strukturiertes Logging (pino), optional Fehler-Tracking (Sentry)
- Backups: nächtlicher `pg_dump` in ein Volume, 30 Tage Retention,
  zusätzlich Kopie off-site; ein Restore-Testlauf ist Teil von Phase 7
- Mailversand über SMTP des Vereins-Providers oder Resend; SPF/DKIM einrichten,
  sonst landen Forderungsbenachrichtigungen im Spam
- Deploy per `git pull && docker compose up -d --build`, dazu ein
  `Makefile`/Skript für Backup, Restore und Logs
- Empfehlung Server: kleiner VPS (2 vCPU / 4 GB) genügt deutlich; Firewall
  nur 80/443 offen, SSH per Key

---

## 12. Umsetzung in Phasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 0 | Repo, Tooling, CI, Docker, DB-Schema v1, Seed-Skript | `docker compose up` läuft |
| 1 | Auth, Profil, Rollen, Admin-Freigabe, Bewerbszuordnung, Mailversand | Man kann sich registrieren |
| 2 | ITN-Import + Matching + Selbsteintrag + Vorrangregel | ITN steht am Profil |
| 3 | Pyramide: Modell, Seeding, öffentliche Ansicht Damen/Herren | Beide Pyramiden sichtbar |
| 4 | Forderungs-Statemachine + Ergebnis + Positionswechsel | Kernspiel funktioniert |
| 5 | Cronjobs, Fristen, Benachrichtigungen, Urlaubsmodus | Läuft ohne Admin-Eingriff |
| 6 | Statistik, Feed, Kalender, Admin-Tools, Audit | v1 komplett |
| 7 | E2E-Tests, Härtung, DSGVO-Seiten, Deployment, Backups | Live |

---

## 13. Offene Punkte (nicht blockierend, vor Livegang zu klären)

1. Vereinsname, Logo, Farben, Domain
2. Wer wird Admin (Startkonto), und soll die Admin-Freigabe neuer Mitglieder
   aktiv sein oder darf sich jeder direkt eintragen?
3. Startgröße je Bewerb — bestimmt die Anzahl der Reihen beim Seeding
4. Soll ein Bewerb mit sehr wenigen Spielerinnen/Spielern (typischerweise Damen)
   als Pyramide oder vorerst als einfache Leiter geführt werden?
5. Feinjustierung der Fristen nach dem ersten Testlauf
6. Impressumsdaten und Datenschutzerklärung (Vereinsangaben nötig)
