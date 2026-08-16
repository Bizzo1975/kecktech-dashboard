#!/usr/bin/env bash
set -euo pipefail
for h in n8n.kecktech.net hub.kecktech.net marketlist.kecktech.net help.kecktech.net; do
  echo "=== $h DNS ==="
  dig +short "$h" @1.1.1.1 || true
  IP=$(dig +short "$h" @1.1.1.1 | head -1)
  if [ -n "$IP" ]; then
    CODE=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 --resolve "${h}:443:${IP}" "https://${h}/" || echo fail)
    echo "HTTP via CF ${IP}: ${CODE}"
  else
    echo "no public DNS"
  fi
done
