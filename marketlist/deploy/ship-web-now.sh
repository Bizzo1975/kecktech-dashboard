#!/bin/bash
set -eux
cd /opt/docker/marketlist
# Extract new archive if present
if [ -f /tmp/marketlist-ship.tar.gz ]; then
  sudo tar -xzf /tmp/marketlist-ship.tar.gz -C /opt/docker/marketlist
fi
sudo docker compose -f docker-compose.prod.yml build web
sudo docker rm -f marketlist-web-1 2>/dev/null || true
# clean orphan name conflicts
sudo docker ps -aq --filter name=marketlist-web | xargs -r sudo docker rm -f
sudo docker compose -f docker-compose.prod.yml up -d --no-build --force-recreate web
sleep 8
sudo docker compose -f docker-compose.prod.yml ps -a
echo "==== HTML MARKERS ===="
curl -sS -H 'Cache-Control: no-cache' http://127.0.0.1:8090/ | grep -oE 'Try demo|hero-aisle|Learn Marketlist|60 seconds|actually finishes' | sort | uniq -c || true
curl -sS -H 'Cache-Control: no-cache' http://127.0.0.1:8090/app | grep -oE "Today.s trip|Learn Marketlist|Continue shopping|Discover" | sort | uniq -c || true
curl -sS -H 'Cache-Control: no-cache' http://127.0.0.1:8090/sw.js | grep -oE 'marketlist-shell-v[0-9]+|navigate' | sort | uniq -c || true
echo -n "PUB:"; curl -sS -o /dev/null -w "%{http_code}\n" https://marketlist.kecktech.net/
echo -n "PUBAPI:"; curl -sS -o /dev/null -w "%{http_code}\n" https://marketlist.kecktech.net/api/health
echo DEPLOY_DONE
