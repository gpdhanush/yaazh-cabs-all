#!/usr/bin/env bash
set -Eeuo pipefail

echo "Building Cab Booking API..."

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
