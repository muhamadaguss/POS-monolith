#!/bin/sh
set -e

echo "Running database migrations..."
cd /app
npx prisma migrate deploy --schema /app/prisma/schema.prisma

echo "Starting backend server..."
exec "$@"
