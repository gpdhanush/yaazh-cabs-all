#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -f dist/jobs/worker.js ]]; then
  node dist/jobs/worker.js
else
  npx tsx src/jobs/worker.ts
fi
