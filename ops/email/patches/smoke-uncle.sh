#!/bin/bash
set -e
CK=/tmp/uj.ck
rm -f "$CK"
HTML=$(curl -sS -c "$CK" -b "$CK" http://127.0.0.1/contact)
TOKEN=$(printf '%s' "$HTML" | sed -n 's/.*name="_token" value="\([^"]*\)".*/\1/p' | head -1)
echo "token_len=${#TOKEN}"
curl -sS -o /tmp/uj.out -w "uncle_http=%{http_code}\n" -c "$CK" -b "$CK" -X POST http://127.0.0.1/contact \
  --data-urlencode "_token=$TOKEN" \
  --data-urlencode "name=Plan Smoke" \
  --data-urlencode "email=support@unclejonsitgarage.com" \
  --data-urlencode "message=Graph confirmation smoke"
grep -E 'Message sent|alert-success|Could not send|alert-danger' /tmp/uj.out | head -5
