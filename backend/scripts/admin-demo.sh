#!/usr/bin/env bash
# Quick smoke: create admin (if needed), login, hit dashboard.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
bash scripts/admin.sh demo
