#!/usr/bin/env bash
# Backup Marketlist Postgres from docker compose production stack.
# Usage (from repo root on host with compose project):
#   bash scripts/backup-db.sh
# Optional env: COMPOSE_FILE, BACKUP_DIR, DB_USER, DB_NAME

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_USER="${DB_USER:-marketlist}"
DB_NAME="${DB_NAME:-grocery_app}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/marketlist-${STAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "Writing ${OUT} ..."
docker compose -f "${COMPOSE_FILE}" exec -T db \
  pg_dump -U "${DB_USER}" "${DB_NAME}" > "${OUT}"

echo "Backup complete: ${OUT}"
echo "Copy this file off-box (scp/rsync) regularly."
