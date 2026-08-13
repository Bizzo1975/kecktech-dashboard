#!/usr/bin/env python3
"""Upsert missing marketing Portfolio rows + ensure displaySites."""
import subprocess

sql = r"""
INSERT INTO "PortfolioItem" (id, title, slug, summary, "liveUrl", tags, featured, "ctaLabel", "ctaUrl", stage, "displaySites", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.title, v.slug, v.summary, v."liveUrl", v.tags, true, v."ctaLabel", v."ctaUrl", 'running_dev', ARRAY['kecktech']::text[], NOW(), NOW()
FROM (VALUES
  ('Customer Portal','portal','Customer portal for Kecktech clients.','https://portal.kecktech.net', ARRAY['portal','customers','live']::text[], 'Open portal', 'https://portal.kecktech.net'),
  ('FarmBot','farmbot','Self-hosted garden robot control plane.','https://farmbot.kecktech.net', ARRAY['garden','robot','live']::text[], 'Open FarmBot', 'https://farmbot.kecktech.net'),
  ('Chat','chat','Open WebUI chat on Kecktech stack.','https://chat.kecktech.net', ARRAY['chat','operator','live']::text[], 'Open chat', 'https://chat.kecktech.net')
) AS v(title, slug, summary, "liveUrl", tags, "ctaLabel", "ctaUrl")
WHERE NOT EXISTS (SELECT 1 FROM "PortfolioItem" p WHERE p.slug = v.slug);

UPDATE "PortfolioItem"
SET title = 'Sovereign Hub',
    "liveUrl" = COALESCE("liveUrl", 'https://sovereign-hub.kecktech.net'),
    "ctaUrl" = COALESCE("ctaUrl", 'https://sovereign-hub.kecktech.net'),
    "displaySites" = CASE WHEN 'kecktech' = ANY("displaySites") THEN "displaySites" ELSE array_append("displaySites", 'kecktech') END,
    "updatedAt" = NOW()
WHERE slug = 'sovereign-hub';

UPDATE "PortfolioItem"
SET "displaySites" = CASE WHEN 'kecktech' = ANY("displaySites") THEN "displaySites" ELSE array_append("displaySites", 'kecktech') END,
    "updatedAt" = NOW()
WHERE slug IN (
  'marketlist','flooros','portal','farmbot','cleaner',
  'argo','netops','chat','sovereign-hub','aerocad'
);

SELECT slug, title, "displaySites" FROM "PortfolioItem"
WHERE slug IN (
  'marketlist','flooros','portal','farmbot','cleaner',
  'argo','netops','chat','sovereign-hub','aerocad'
)
ORDER BY slug;
"""

subprocess.run(
    [
        "docker",
        "compose",
        "-f",
        "docker-compose.prod.yml",
        "--env-file",
        ".env.production",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "me_manager",
        "-d",
        "me_manager",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
    ],
    cwd="/opt/me-manager",
    check=False,
)
