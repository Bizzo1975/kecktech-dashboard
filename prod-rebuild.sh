#!/bin/bash
set -euo pipefail

cd /opt/docker/dashboard/website
npm install
sed -i 's|dev-wiki.kecktech.net|help.kecktech.net|g; s|dev-help.kecktech.net|help.kecktech.net|g; s|dev-admin.kecktech.net|admin.kecktech.net|g; s|dev.kecktech.net|www.kecktech.net|g' src/components/Header.astro src/components/Footer.astro
./node_modules/.bin/astro build

cd /opt/docker/dashboard
docker compose up -d kecktech-admin
docker compose restart kecktech-web

echo "BUILD_OK"
