# Deployment Docker ke CasaOS (STB arm64)

Dokumentasi ini menjelaskan cara deploy Kasirku ke home server dengan CasaOS menggunakan Docker.

## Prerequisites

- STB dengan CasaOS (arm64/aarch64)
- Docker & Docker Compose terinstall di CasaOS
- Akun Docker Hub untuk push/pull image
- Cloudflared tunnel yang sudah dikonfigurasi di CasaOS

## 1. Build Image di Mesin Lain

Image di-build di mesin dengan arsitektur berbeda (amd64/x86_64) dan di-push ke Docker Hub.

### Backend
```bash
# Build & push backend image untuk arm64
docker buildx build \
  --platform linux/arm64 \
  -t docker.io/<username>/kasirku-backend:latest \
  --push \
  apps/backend
```

### Frontend
```bash
# Build & push frontend image (NEXT_PUBLIC_API_URL = domain tunnel backend)
docker buildx build \
  --platform linux/arm64 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.<domain>.trycloudflare.com/api/v1 \
  -t docker.io/<username>/kasirku-frontend:latest \
  --push \
  apps/frontend
```

> **Note:** `NEXT_PUBLIC_API_URL` harus domain tunnel backend (bukan IP). Ini di-bake saat build.

### Login Docker Hub
```bash
docker login docker.io
```

## 2. Setup di STB (CasaOS)

### Copy Files
```bash
# Di casaos, buat folder untuk Kasirku
mkdir -p ~/kasirku
cd ~/kasirku

# Copy docker-compose.yml dan .env.docker.example
# (dari laptop atau clone repo)
cp docker-compose.yml .
cp .env.docker.example .env
```

### Edit `.env`
Sesuaikan `.env` dengan values yang benar:

```bash
# JWT Tokens - generate dengan:
# openssl rand -base64 32 | tr -d '\n' && echo
JWT_ACCESS_SECRET=<generate-with-openssl>
JWT_REFRESH_SECRET=<generate-with-openssl>

# Auth.js
AUTH_SECRET=<generate-with-openssl>
AUTH_URL=http://localhost:3000

# Backend
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Frontend - GUNAKAN DOMAIN TUNNEL BACKEND
NEXT_PUBLIC_API_URL=https://api.<domain>.trycloudflare.com/api/v1

# Database (pakai service name 'db' dari compose)
DATABASE_URL=postgresql://kasirku:kasirku@db:5432/kasirku?schema=public
```

### Setup Cloudflared Tunnel

Di cloudflared yang sudah ada di CasaOS:
1. Buka Cloudflare Zero Trust dashboard
2. Buat tunnel baru (jika belum ada)
3. Tambahkan 2 hostname:
   - `frontend.<domain>.trycloudflare.com` → route ke `http://<ip-stb-lan>:3000`
   - `api.<domain>.trycloudflare.com` → route ke `http://<ip-stb-lan>:3001`

### Start Stack
```bash
docker compose pull
docker compose up -d
```

## 3. Verifikasi

### Cek Status
```bash
docker compose ps
docker compose logs -f
```

### Health Check Backend
```bash
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/health/ready
```

### Login Frontend
Buka browser: `https://frontend.<domain>.trycloudflare.com`

### Seed Data (opsional)
```bash
# Seed database untuk testing
docker compose exec backend npx ts-node --transpile-only \
  --compiler-options '{"module":"CommonJS"}' \
  packages/database/prisma/seed.ts
```

## 4. Akses Aplikasi

| Service | URL |
|---------|-----|
| Frontend (UI) | `https://frontend.<domain>.trycloudflare.com` |
| Backend API | `https://api.<domain>.trycloudflare.com/api/v1` |
| Swagger UI | `https://api.<domain>.trycloudflare.com/api/docs` |

## Troubleshooting

### Container tidak start
```bash
# Check logs
docker compose logs [service-name]

# Rebuild jika perlu
docker compose build --no-cache
docker compose up -d
```

### Database connection error
Pastikan `DATABASE_URL` di `.env` menggunakan service name `db` (bukan `localhost`):
```bash
DATABASE_URL=postgresql://kasirku:kasirku@db:5432/kasirku?schema=public
```

### PWA tidak installable
Pastikan:
1. Cloudflared route menggunakan HTTPS (bukan HTTP)
2. Manifest URL dan start_url di manifest.ts sesuai domain

## Update

```bash
docker compose pull
docker compose up -d
```

## Backup

Backup volume PostgreSQL:
```bash
docker run --rm \
  -v kasirku-pgdata:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/pgdata-backup.tar.gz /data
```
