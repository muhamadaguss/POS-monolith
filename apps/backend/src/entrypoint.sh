#!/bin/sh
set -e

echo "Running database migrations..."
cd /app
npx prisma migrate deploy --schema /app/prisma/schema.prisma

echo "Checking if seed data already exists..."
cd /app/packages/database
# Cek tenant demo — jika sudah ada artinya seed sudah pernah jalan
if node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.tenant.findUnique({ where: { slug: 'demo-toko' } })
  .then((t) => process.exit(t ? 0 : 1))
  .catch(() => process.exit(1));
" 2>/dev/null; then
  echo "Seed data already exists, skipping..."
else
  echo "Seeding database with demo data..."
  npm run db:seed
  echo "Seed completed."
fi

echo "Starting backend server..."
cd /app
exec "$@"
