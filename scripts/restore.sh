#!/bin/sh
# Restore a backup produced by scripts/backup.sh.
# Usage: ./scripts/restore.sh backups/pyramide_2026-09-06_030000.sql.gz
#
# DESTRUCTIVE: drops and recreates the target database. Only run this
# against a database you intend to overwrite.
set -eu

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-dump.sql.gz>" >&2
  exit 1
fi
DUMP="$1"

cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
[ -f .env ] && . ./.env

DB="${POSTGRES_DB:-pyramide}"
USER="${POSTGRES_USER:-pyramide}"

echo "About to DROP and recreate database '$DB' from $DUMP."
printf 'Type the database name to confirm: '
read -r CONFIRM
if [ "$CONFIRM" != "$DB" ]; then
  echo "Aborted." >&2
  exit 1
fi

docker compose exec -T postgres psql -U "$USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$DB\";" \
  -c "CREATE DATABASE \"$DB\" OWNER \"$USER\";"

gunzip -c "$DUMP" | docker compose exec -T postgres psql -U "$USER" -d "$DB"

echo "Restore complete."
