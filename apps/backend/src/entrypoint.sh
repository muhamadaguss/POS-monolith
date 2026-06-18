#!/bin/sh
set -e

echo "Running database migrations..."
cd /app
npx prisma migrate deploy --schema /app/prisma/schema.prisma

echo "Seeding database with demo data..."
npx prisma db seed --schema /app/prisma/schema.prisma

echo "Starting backend server..."
exec "$@"
