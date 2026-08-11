#!/usr/bin/env bash
set -Eeuo pipefail

echo "Building Cab Booking API..."

if [[ ! -f ".env" ]]; then
  echo "ERROR: .env file not found."
  echo "Create it from .env.example."
  exit 1
fi

echo "Installing dependencies..."
npm ci

echo "Generating Prisma client..."
npx prisma generate

echo "Running TypeScript check..."
npm run typecheck

echo "Running lint..."
npm run lint || true

echo "Running tests..."
npm test

echo "Building application..."
npm run build

echo "Build completed successfully."
