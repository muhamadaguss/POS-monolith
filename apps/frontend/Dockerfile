# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files (root + frontend)
COPY package.json package-lock.json ./
COPY apps/frontend/package*.json ./
COPY packages/database/package*.json ./database/

# Install all deps (termasuk prisma CLI di root untuk schema)
RUN npm ci

# Install database deps untuk prisma generate (type dependencies)
RUN cd database && npm ci

# Copy sisa source
COPY apps/frontend/ ./apps/frontend/
COPY packages/database/ ./packages/database/

# Generate Prisma client (untuk backend, tidak dipakai frontend tapi aman)
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

# Build frontend (dengan NEXT_PUBLIC_API_URL build-arg)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN cd apps/frontend && npm run build

# Stage 2: Runtime (next start)
FROM node:22-slim AS runtime
WORKDIR /app

# Install ca-certificates (Debian-slim uses apt-get, not apk)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy dari build stage (standalone output)
COPY --from=build --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/frontend/.next/static ./.next/static
COPY --from=build --chown=node:node /app/apps/frontend/public ./public
COPY --from=build --chown=node:node /app/node_modules ./node_modules

# Port 3000
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
