#!/bin/bash
set -euo pipefail
cd /opt/me-manager
docker compose -f docker-compose.prod.yml --env-file .env.production up -d app worker
sleep 5
# Upsert persona (leaves cmsEnabled false) then flip enabled after bridge ok
if [[ -f scripts/upsert-unclejon-persona.ts ]]; then
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T app \
    npx tsx scripts/upsert-unclejon-persona.ts || \
  npx tsx scripts/upsert-unclejon-persona.ts || true
fi
# Enable cmsEnabled for unclejon via prisma in container
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T app node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const row = await prisma.property.findFirst({
    where: { OR: [{ siteKey: 'unclejon' }, { url: 'https://unclejonsitgarage.com' }] },
  });
  if (!row) {
    console.log('PROPERTY_MISSING');
    process.exit(2);
  }
  const updated = await prisma.property.update({
    where: { id: row.id },
    data: {
      cmsEnabled: true,
      cmsBaseUrl: process.env.UNCLEJON_CMS_URL || 'http://10.20.0.202:3006',
      siteKey: 'unclejon',
      status: 'live',
    },
  });
  console.log('CMS_ENABLED', updated.siteKey, updated.cmsEnabled, updated.cmsBaseUrl ? 'url_set' : 'url_missing');
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE
