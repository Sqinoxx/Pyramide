#!/bin/sh
# Nightly Postgres backup. Intended to run on the HOST (via cron), next to
# docker-compose.yml, e.g.:
#   0 3 * * * cd /opt/pyramide && ./scripts/backup.sh >> /var/log/pyramide-backup.log 2>&1
#
# Keeps 30 days of dumps in ./backups. Pair with scripts/restore.sh, and
# actually run a restore once (PLAN.md §11) — an untested backup is not a backup.
set -eu

cd "$(dirname "$0")/.."
mkdir -p backups

# shellcheck disable=SC1091
[ -f .env ] && . ./.env

STAMP=$(date +%Y-%m-%d_%H%M%S)
OUT="backups/pyramide_${STAMP}.sql.gz"

docker compose exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-pyramide}" "${POSTGRES_DB:-pyramide}" \
  | gzip > "$OUT"

echo "Backup written to $OUT"

# Retention: delete dumps older than 30 days.
find backups -name 'pyramide_*.sql.gz' -mtime +30 -delete
