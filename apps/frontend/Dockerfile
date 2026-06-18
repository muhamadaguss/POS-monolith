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

# Generate Prisma client — pin versi 5.x (npx tanpa pin akan auto-install v7 yg breaking)
RUN npx prisma@5 generate --schema packages/database/prisma/schema.prisma

# Build frontend (dengan NEXT_PUBLIC_API_URL & NEXT_PUBLIC_SENTRY_DSN build-arg)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

RUN cd apps/frontend && npm run build

# Stage 2: Runtime (next start)
FROM node:22-alpine AS runtime
WORKDIR /app

# Install ca-certificates (Alpine uses apk)
RUN apk add --no-cache ca-certificates

# Copy seluruh standalone output dari build stage ke /app
# (Note: Next.js monorepo menaruh server.js di apps/frontend/server.js)
COPY --from=build /app/apps/frontend/.next/standalone/ /app/

# Copy static assets & public (harus di-serve oleh Next.js server)
COPY --from=build /app/apps/frontend/.next/static /app/apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public /app/apps/frontend/public

# Port 3000
EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/frontend/server.js"]
