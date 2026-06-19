#!/bin/sh
set -e

echo "Running database migrations..."
cd /app
npx prisma migrate deploy --schema /app/prisma/schema.prisma

SEED_MARKER="/app/.seed-done"
if [ ! -f "$SEED_MARKER" ]; then
  echo "Seeding database with demo data..."
  cd /app/packages/database
  npm run db:seed
  touch "$SEED_MARKER"
  echo "Seed completed. Marker created."
else
  echo "Seed already done, skipping..."
fi

echo "Starting backend server..."
cd /app
exec "$@"
