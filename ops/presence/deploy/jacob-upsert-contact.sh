#!/bin/bash
set -euo pipefail
cd /opt/docker/personal-website
ENVF=.env.production
[[ -f "$ENVF" ]] || ENVF=.env
USER=$(grep -E '^POSTGRES_USER=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
DB=$(grep -E '^POSTGRES_DB=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
USER=${USER:-postgres}
DB=${DB:-personal_website}
python3 - <<'PY'
from pathlib import Path
content = """Have a question about a story, a framework, or Lost in Thought? Use the form below — messages go to hello@jacob-roman.com.

This site is author-only. It is not a tech support desk and not linked to MSP or build-in-public brands.
"""
Path('/tmp/jacob-contact.sql').write_text(
    """
UPDATE pages SET
  title = 'Contact Jacob Roman',
  content = $c$""" + content + """$c$,
  meta_description = 'Contact Jacob Roman — hello@jacob-roman.com',
  header_title = 'Contact',
  header_subtitle = 'Author mail only',
  updated_at = CURRENT_TIMESTAMP
WHERE slug = 'contact';
""",
    encoding='utf-8',
)
print('CONTACT_SQL_READY')
PY
docker compose -f docker-compose.prod.yml --env-file "$ENVF" exec -T db \
  psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 < /tmp/jacob-contact.sql
echo CONTACT_OK
