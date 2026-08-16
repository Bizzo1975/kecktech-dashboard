#!/usr/bin/env bash
set -euo pipefail
for h in sovereign.kecktech.net hub.kecktech.net n8n.kecktech.net marketlist.kecktech.net help.kecktech.net; do
  echo "=== $h ==="
  echo -n "internal: "; dig +short "$h" @10.10.0.1 | head -3
  echo -n "public:   "; dig +short "$h" @1.1.1.1 | head -3
done
