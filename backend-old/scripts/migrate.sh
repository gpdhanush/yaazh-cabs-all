#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/env.sh"
load_dotenv .env
resolve_db_config

if [[ -z "${DB_NAME}" || -z "${DB_USER}" ]]; then
  echo "ERROR: DB_NAME / DB_USER missing in .env"
  exit 1
fi

echo "Applying business schema to ${DB_NAME}@${DB_HOST}:${DB_PORT} as ${DB_USER}..."
mysql_cmd < database/cab_booking_production_v2.sql

echo "Applying cPanel infra migration..."
mysql_cmd < database/migrations/001_infra_cpanel.sql

echo "Applying routes image/amount migration..."
mysql_cmd < database/migrations/002_routes_image_amount.sql

echo "Applying booking odometer migration..."
mysql_cmd < database/migrations/003_booking_odometer.sql

echo "Applying utf8mb4 (₹ / Unicode) migration..."
mysql_cmd < database/migrations/005_utf8mb4.sql

echo "Applying trip_events fare_adjusted enum..."
mysql_cmd < database/migrations/006_trip_events_fare_adjusted.sql

echo "Applying gallery groups and images..."
mysql_cmd < database/migrations/007_gallery.sql

echo "Applying gallery permissions..."
mysql_cmd < database/migrations/010_gallery_permissions.sql

echo "Generating Prisma client..."
npx prisma generate

echo "Migration complete."
