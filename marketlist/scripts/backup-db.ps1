# Backup Marketlist Postgres from docker compose production stack (Windows).
# Usage (from repo root):
#   powershell -File scripts/backup-db.ps1
# Optional env: COMPOSE_FILE, BACKUP_DIR, DB_USER, DB_NAME

$ErrorActionPreference = "Stop"

$ComposeFile = if ($env:COMPOSE_FILE) { $env:COMPOSE_FILE } else { "docker-compose.prod.yml" }
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }
$DbUser = if ($env:DB_USER) { $env:DB_USER } else { "marketlist" }
$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { "grocery_app" }
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Out = Join-Path $BackupDir "marketlist-$Stamp.sql"

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "Writing $Out ..."
docker compose -f $ComposeFile exec -T db pg_dump -U $DbUser $DbName | Set-Content -Path $Out -Encoding utf8

Write-Host "Backup complete: $Out"
Write-Host "Copy this file off-box regularly."
