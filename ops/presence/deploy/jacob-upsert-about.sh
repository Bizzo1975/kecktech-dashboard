#!/bin/bash
set -euo pipefail
cd /opt/docker/personal-website
ENVF=.env.production
[[ -f "$ENVF" ]] || ENVF=.env
# Avoid sourcing (BOM / Windows CRLF). Read only the two vars we need.
USER=$(grep -E '^POSTGRES_USER=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
DB=$(grep -E '^POSTGRES_DB=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
USER=${USER:-postgres}
DB=${DB:-personal_website}
echo "DB=$DB USER=$USER"
docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T db \
  psql -U "$USER" -d "$DB" -c "SELECT slug, left(title,60) AS title, left(coalesce(content,''),100) AS content FROM pages WHERE slug IN ('about','contact');"

python3 - <<'PY'
from pathlib import Path
about = """Jacob Roman is a pen name for long-form work about attention, disposable lives, moral perspective, and the numbers we use to measure ourselves — fiction and frameworks written for readers, not for a tech brand.

Current book projects include *My Disposable Lives*, *Yours, Mine, and the Truth*, *101 Perspectives*, *Know Your Number*, and *The Quiet Field*. Drafts and craft notes move through Lost in Thought and surface here when they are ready for readers.

This site stays author-isolated: no MSP pitches, no build-in-public tooling posts. If you want to reach the author, use the [contact](/contact) form — messages go to [hello@jacob-roman.com](mailto:hello@jacob-roman.com).
"""
Path('/tmp/jacob-about.sql').write_text(
    """
INSERT INTO pages (name, title, slug, content, meta_description, header_title, header_subtitle)
VALUES (
  'About',
  'About Jacob Roman',
  'about',
  $about$""" + about + """$about$,
  'About Jacob Roman — author of literary fiction and frameworks.',
  'About Jacob Roman',
  'Fiction and frameworks for readers'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  meta_description = EXCLUDED.meta_description,
  header_title = EXCLUDED.header_title,
  header_subtitle = EXCLUDED.header_subtitle,
  updated_at = CURRENT_TIMESTAMP;
""",
    encoding='utf-8',
)
print('SQL_READY')
PY

docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T db \
  psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 < /tmp/jacob-about.sql
echo ABOUT_UPSERT_OK
docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T db \
  psql -U "$USER" -d "$DB" -c "SELECT slug, left(title,60), left(content,80) FROM pages WHERE slug='about';"
