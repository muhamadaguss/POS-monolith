# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files
COPY apps/backend/package*.json ./
COPY apps/backend/next.config.ts ./  # Untuk monorepo root config (tidak dipakai backend, tapi aman)
COPY packages/database/package*.json ./database/

# Install backend deps (termasuk prisma CLI & @prisma/client)
RUN npm ci --omit=dev

# Install database deps untuk prisma generate (type dependencies)
RUN cd database && npm ci

# Stage 2: Build
FROM node:22-alpine AS build
WORKDIR /app

# Copy dari deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/database/node_modules/database/node_modules ./database/node_modules

# Copy source
COPY apps/backend/ ./apps/backend/
COPY packages/database/ ./packages/database/

# Generate Prisma client (dari schema database, hoist ke root node_modules)
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

# Build backend
RUN cd apps/backend && npm run build

# Stage 3: Runtime
FROM node:22-slim AS runtime
WORKDIR /app

# Install ca-certificates untuk HTTPS (Prisma/Postgres)
RUN apk add --no-cache ca-certificates

# Create uploads directory dengan proper permissions
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

# Copy dari build stage
COPY --from=build --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/database/prisma ./packages/database/prisma

# Copy schema & migrations dari database (untuk prisma migrate deploy)
COPY --from=build --chown=node:node /app/packages/database/prisma/schema.prisma ./prisma/schema.prisma

# Entry point: migrate deploy lalu start
COPY --chown=node:node apps/backend/src/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "apps/backend/dist/main"]
