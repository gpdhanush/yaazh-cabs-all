#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Seed data is included in database/cab_booking_production_v2.sql"
echo "Creating default super admin (and optional demo driver)..."

if [[ -f dist/jobs/seed.js ]]; then
  node dist/jobs/seed.js
else
  npx tsx src/jobs/seed.ts
fi
