#!/bin/bash
# Rebuild Kecktech Astro marketing site (static) for nginx.
# IMPORTANT: never replace the dist/ directory inode — docker bind-mounts it.
# Clearing/recreating dist/ leaves the container serving a deleted directory (404).
set -euo pipefail
SITE_DIR="${KECKTECH_ASTRO_DIR:-/opt/docker/dashboard/website}"
CMS_URL="${PUBLIC_KECKTECH_CMS_URL:-http://127.0.0.1:8085}"
OWNER="${KECKTECH_ASTRO_OWNER:-kecktech:kecktech}"
cd "$SITE_DIR"
export PUBLIC_KECKTECH_CMS_URL="$CMS_URL"

mkdir -p dist
# Clear contents only (keep directory inode for docker mount)
if command -v sudo >/dev/null 2>&1; then
  sudo find dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  # Fix ownership so non-root build can write
  sudo chown -R "$OWNER" dist || true
else
  find dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi

npm run build

if command -v sudo >/dev/null 2>&1; then
  sudo chown -R "$OWNER" dist || true
  sudo chmod -R u+rwX,g+rwX,o+rX dist || true
fi

if [ ! -f dist/index.html ]; then
  echo "ERROR: dist/index.html missing after build" >&2
  exit 1
fi

echo "Astro rebuild complete in $SITE_DIR ($(find dist -name index.html | wc -l) html pages)"
