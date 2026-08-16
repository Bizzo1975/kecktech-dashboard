#!/usr/bin/env python3
"""Align Portfolio marketing demos: canonical slugs + kecktech displaySites allowlist."""
import subprocess

sql = r"""
-- Remap legacy marketing slugs to canonical ids (when target free)
DO $$
DECLARE
  pairs text[][] := ARRAY[
    ARRAY['net-ops','netops'],
    ARRAY['kecktech-portal','portal'],
    ARRAY['chat-kecktech','chat'],
    ARRAY['sovereign','sovereign-hub'],
    ARRAY['syll','aerocad']
  ];
  p text[];
BEGIN
  FOREACH p SLICE 1 IN ARRAY pairs LOOP
    IF EXISTS (SELECT 1 FROM "PortfolioItem" WHERE slug = p[1])
       AND NOT EXISTS (SELECT 1 FROM "PortfolioItem" WHERE slug = p[2]) THEN
      UPDATE "PortfolioItem" SET slug = p[2] WHERE slug = p[1];
    ELSIF EXISTS (SELECT 1 FROM "PortfolioItem" WHERE slug = p[1])
       AND EXISTS (SELECT 1 FROM "PortfolioItem" WHERE slug = p[2]) THEN
      -- Prefer canonical row: move SiteProject links then drop legacy
      UPDATE "SiteProject" sp
      SET "portfolioItemId" = c.id
      FROM "PortfolioItem" legacy, "PortfolioItem" c
      WHERE legacy.slug = p[1] AND c.slug = p[2]
        AND sp."portfolioItemId" = legacy.id
        AND NOT EXISTS (
          SELECT 1 FROM "SiteProject" x
          WHERE x."portfolioItemId" = c.id AND x.site = sp.site
        );
      DELETE FROM "SiteProject" WHERE "portfolioItemId" IN (
        SELECT id FROM "PortfolioItem" WHERE slug = p[1]
      );
      DELETE FROM "PortfolioItem" WHERE slug = p[1];
    END IF;
  END LOOP;
END $$;

-- Ensure marketing allowlist has kecktech in displaySites
UPDATE "PortfolioItem"
SET "displaySites" = CASE
  WHEN 'kecktech' = ANY("displaySites") THEN "displaySites"
  ELSE array_append("displaySites", 'kecktech')
END
WHERE slug IN (
  'marketlist','flooros','portal','farmbot','cleaner',
  'argo','netops','chat','sovereign-hub','aerocad'
);

-- Strip kecktech from non-marketing junk that pollutes /demos via sync
UPDATE "PortfolioItem"
SET "displaySites" = array_remove("displaySites", 'kecktech')
WHERE slug NOT IN (
  'marketlist','flooros','portal','farmbot','cleaner',
  'argo','netops','chat','sovereign-hub','aerocad'
)
AND 'kecktech' = ANY("displaySites")
AND (
  title ILIKE '%help%'
  OR title ILIKE '%homepage%'
  OR title ILIKE '%lost in thought%'
  OR slug IN ('kecktech','help-kecktech','kecktech-dash','lostinthought-editor','claudette','homepage')
);

SELECT slug, title, "displaySites"
FROM "PortfolioItem"
WHERE 'kecktech' = ANY("displaySites")
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
