#!/bin/sh
set -e

echo "Running database migrations..."
cd /app
npx prisma migrate deploy --schema /app/prisma/schema.prisma

echo "Seeding database with demo data..."
cd /app/packages/database
npm run db:seed

echo "Starting backend server..."
cd /app
exec "$@"
