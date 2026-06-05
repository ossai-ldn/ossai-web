#!/usr/bin/env bash
# Sets shopLive=true via deployed adminApi.
# Usage: ADMIN_SECRET=your-secret ./scripts/go-live.sh
set -euo pipefail

if [ -z "${ADMIN_SECRET:-}" ]; then
  echo "Set ADMIN_SECRET (same value as firebase functions:secrets:set ADMIN_SECRET)"
  exit 1
fi

curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"data\":{\"adminSecret\":\"$ADMIN_SECRET\",\"action\":\"setShopLive\"}}" \
  "https://europe-west2-ossai-82889.cloudfunctions.net/adminApi"

echo ""
curl -s -X POST -H "Content-Type: application/json" -d '{"data":{}}' \
  "https://europe-west2-ossai-82889.cloudfunctions.net/getSiteStatus"
echo ""
