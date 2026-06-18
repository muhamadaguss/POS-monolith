# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files (root + frontend only, tidak butuh database)
COPY package.json package-lock.json ./
COPY apps/frontend/package*.json ./

# Install all deps
RUN npm ci

# Copy source
COPY apps/frontend/ ./apps/frontend/

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
