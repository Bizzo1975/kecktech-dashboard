#!/bin/bash
set -e
echo "=== jacob smoke ==="
curl -sS -w "\njacob_http=%{http_code}\n" -X POST http://127.0.0.1:3000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Plan Smoke","email":"hello@jacob-roman.com","message":"Graph confirmation smoke"}'
echo
sudo docker logs jacob-roman-blog-app-prod --tail 30 2>&1 | tail -30
