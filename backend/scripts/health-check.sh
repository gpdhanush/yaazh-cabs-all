#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/env.sh"
load_dotenv .env
resolve_db_config
URL="${APP_URL:-http://127.0.0.1:${PORT:-3000}}"
curl -fsS "$URL/health" >/dev/null
curl -fsS "$URL/ready" >/dev/null
echo "Health checks passed. DB=${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
