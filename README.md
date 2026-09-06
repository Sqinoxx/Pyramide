# Tennis-Forderungspyramide

Web-App für eine Tennis-Forderungspyramide mit getrennten Bewerben
(Herren/Damen), OÖTV-ITN-Integration und automatisierter Forderungslogik.
Siehe [`PLAN.md`](./PLAN.md) für die vollständige Spezifikation.

## Stack

Next.js 15 (App Router, TypeScript) · PostgreSQL 16 + Drizzle ORM · Auth.js v5
· Tailwind CSS · Vitest.

## Lokale Entwicklung

Voraussetzungen: Node 22+, Docker (für Postgres).

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed      # legt Divisions, Admin- und ~40 Testmitglieder an
npm run dev
```

App läuft dann auf http://localhost:3000. Seed-Zugangsdaten stehen am Ende
der Seed-Ausgabe (Standard: `admin@example.com` als Admin, `herr1..N@example.com`
/ `dame1..N@example.com` als Mitglieder, Passwort `testpass123`).

### Tests

```bash
npm run test          # Vitest, einmalig
npm run test:watch    # Vitest im Watch-Modus
npm run lint
npx tsc --noEmit
```

### Datenbank-Schema ändern

Schema liegt in [`src/db/schema.ts`](./src/db/schema.ts). Nach einer Änderung:

```bash
npm run db:generate   # erzeugt eine neue Migration unter ./drizzle
npm run db:migrate    # wendet ausstehende Migrationen an
```

`drizzle/0001_partial_indexes.sql` ist eine handgeschriebene Migration (siehe
Kommentar darin) — beim nächsten `db:generate` bleibt sie unangetastet, da sie
nicht Teil von `schema.ts` ist.

## Produktivbetrieb (Docker)

```bash
cp .env.example .env   # echte Secrets eintragen!
docker compose up -d --build
```

Das startet vier Services: `app` (Next.js, führt beim Start automatisch
ausstehende Migrationen aus), `worker` (Cronjobs, siehe `PLAN.md` §8),
`postgres` und `caddy` (Reverse-Proxy mit automatischem TLS — `DOMAIN` in
`.env` setzen).

Backup / Restore:

```bash
./scripts/backup.sh                       # nach ./backups/, 30 Tage Retention
./scripts/restore.sh backups/pyramide_....sql.gz
```

## Projektstruktur

```
src/
  app/            Next.js App-Router-Routen (Seiten + API)
  lib/            Reine, ungetestete-I/O-freie Logik (Pyramide, ITN-Matching,
                  Forderungs-Zustandsautomat, Regelparameter) — unit-getestet
  server/         DB-Zugriffsschicht / Services (Transaktionen, Locking)
  db/             Drizzle-Schema, Migrationsrunner, Seed-Skript
  worker/         Cron-Worker-Entrypoint
drizzle/          SQL-Migrationen
scripts/          Build-/Betriebs-Skripte (Server-Bundle, Backup, Restore)
```
