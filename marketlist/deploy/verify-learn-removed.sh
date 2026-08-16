#!/bin/bash
set -eux
echo "=== Learn Marketlist in container ==="
sudo docker exec marketlist-web-1 grep -R "Learn Marketlist" /app 2>/dev/null | head -30 || true
echo "=== Today's trip in next build ==="
sudo docker exec marketlist-web-1 grep -R "Today" /app/apps/web/.next/server/app/app 2>/dev/null | head -10 || true
echo "=== page.js head strings ==="
sudo docker exec marketlist-web-1 sh -c 'find /app -path "*server/app/app/page*" -name "*.js" 2>/dev/null | head -5'
sudo docker exec marketlist-web-1 sh -c 'P=$(find /app -path "*server/app/app/page.js" 2>/dev/null | head -1); echo PATH=$P; if [ -n "$P" ]; then grep -o "Learn Marketlist\|Today.s trip\|Turn dinner\|Discover\|coachSteps" "$P" | sort | uniq -c; fi'
echo DONE
