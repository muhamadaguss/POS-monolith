# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files
COPY apps/backend/package*.json ./
COPY packages/database/package*.json ./database/
# Install build tools untuk native dependencies (misal bcrypt / node-pre-gyp)
RUN apk add --no-cache python3 make g++

# Install backend deps (termasuk prisma CLI, TypeScript, NestJS — butuh dev deps untuk build)
RUN npm ci

# Install database deps untuk prisma generate (type dependencies)
RUN cd database && npm ci

# Stage 2: Build
FROM node:22-alpine AS build
WORKDIR /app

# Copy dari deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/database/node_modules ./database/node_modules

# Copy source
COPY apps/backend/ ./apps/backend/
COPY packages/database/ ./packages/database/

# Generate Prisma client (dari schema database, hoist ke root node_modules)
# Generate Prisma client — pin versi 5.x (npx tanpa pin akan auto-install v7 yg breaking)
RUN npx prisma@5 generate --schema packages/database/prisma/schema.prisma

# Build backend
RUN cd apps/backend && npm run build

# Stage 3: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app

# Install ca-certificates & openssl untuk HTTPS/Prisma — Alpine uses apk
RUN apk add --no-cache ca-certificates openssl

# Create uploads directory dengan proper permissions
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

# Copy dari build stage
COPY --from=build --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/database/prisma ./packages/database/prisma

# Copy database package.json & node_modules untuk seed (butuh ts-node)
COPY --from=build --chown=node:node /app/packages/database/package.json ./packages/database/package.json
COPY --from=build --chown=node:node /app/database/node_modules ./packages/database/node_modules

# Copy schema file ke lokasi yang diharapkan entrypoint (/app/prisma/schema.prisma)
COPY --from=build --chown=node:node /app/packages/database/prisma/schema.prisma ./prisma/schema.prisma

# PENTING: Copy juga folder migrations agar Prisma tahu struktur tabel apa yang harus dibuat
COPY --from=build --chown=node:node /app/packages/database/prisma/migrations ./prisma/migrations

# Entry point: migrate deploy lalu start
COPY --chown=node:node apps/backend/src/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "apps/backend/dist/main"]
