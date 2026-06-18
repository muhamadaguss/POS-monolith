# Deployment Docker ke CasaOS (STB amd64)

Dokumentasi ini menjelaskan cara deploy Kasirku ke home server dengan CasaOS menggunakan Docker.

## Prerequisites

- STB dengan CasaOS (amd64/x86_64, RAM 2 GB min)
- Docker & Docker Compose terinstall di CasaOS
- Akun Docker Hub untuk push/pull image
- Cloudflared tunnel yang sudah dikonfigurasi di CasaOS
- Dozzle (opsional) — real-time log viewer

## 1. Build Image di Mesin Lain

Image di-build di mesin development dan di-push ke Docker Hub.

### Backend
```bash
# Build & push backend image
docker buildx build \
  --platform linux/amd64 \
  -t docker.io/<username>/kasirku-backend:latest \
  --push \
  apps/backend
```

### Frontend
```bash
# Build & push frontend image (NEXT_PUBLIC_API_URL = domain tunnel backend)
docker buildx build \
  --platform linux/amd64 \
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
mkdir -p ~/kasirku && cd ~/kasirku

# Copy docker-compose.yml dan .env.docker.example
cp docker-compose.yml .
cp .env.docker.example .env

# Copy folder infra/ (Loki, Fluent Bit, Grafana configs)
cp -r infra/ .
```

### Edit `.env`
Semua konfigurasi ada di satu file `.env` (dibaca via `env_file` di compose).

```bash
# Database
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/kasirku_db?schema=public

# JWT Tokens — generate dengan:
# openssl rand -base64 32 | tr -d '\n' && echo
JWT_ACCESS_SECRET=<generate-with-openssl>
JWT_REFRESH_SECRET=<generate-with-openssl>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Backend
NODE_ENV=production
PORT=3005
APP_URL=http://localhost:3005
FRONTEND_URL=https://frontend.<domain>.trycloudflare.com

# Auth.js
AUTH_SECRET=<generate-with-openssl>
AUTH_URL=https://frontend.<domain>.trycloudflare.com

# Frontend (di-bake saat build, tidak perlu di-runtime)
NEXT_PUBLIC_API_URL=https://api.<domain>.trycloudflare.com/api/v1

# Sentry (opsional)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0

# Grafana
GRAFANA_ADMIN_PASSWORD=<password-aman>
```

### Setup Cloudflared Tunnel

Di cloudflared yang sudah ada di CasaOS:
1. Buka Cloudflare Zero Trust dashboard
2. Buat tunnel baru (jika belum ada)
3. Tambahkan 2 hostname:
   - `frontend.<domain>.trycloudflare.com` → `http://<stb-ip>:3004`
   - `api.<domain>.trycloudflare.com` → `http://<stb-ip>:3005`

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
curl http://localhost:3005/api/v1/health
curl http://localhost:3005/api/v1/health/ready
```

### Login Frontend
Buka browser: `https://frontend.<domain>.trycloudflare.com`

### Log Aggregation (Grafana)
Buka: `http://<stb-ip>:3200` — login: `admin` / `<GRAFANA_ADMIN_PASSWORD>`

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
| Grafana (log) | `http://<stb-ip>:3200` |

## 5. Log Aggregation

Kasirku menggunakan **Loki + Fluent Bit + Grafana** untuk centralized logging.

### Arsitektur
```
Backend (pino JSON → stdout)  →  Fluent Bit  →  Loki  →  Grafana
Frontend (client-logger.ts)   →  Backend proxy →  Loki
```

### Query Dasar (LogQL)

Buka Grafana → Explore → pilih datasource "Loki":

| Query | Hasil |
|-------|-------|
| `{service="backend"}` | Semua log backend |
| `{service="backend"} \|= "error"` | Hanya error |
| `{service="backend"} \|= "<reqId>"` | Trace by request ID |
| `{service="frontend"}` | Error dari browser |
| `{service="backend"} \| json \| res_statusCode >= 500` | 5xx errors only |

### Dashboard
Dashboard "Kasirku Backend" sudah ter-provisioning otomatis di Grafana:
- **Log Volume by Level** — distribusi level log per menit
- **5xx Errors** — stat error terbaru
- **Request Rate** — jumlah request per menit
- **P95 Latency** — persentil 95 response time (ms)
- **Top Errors** — 10 error message paling sering (6 jam terakhir)
- **Recent Errors** — live feed error

### Retensi
Log disimpan **30 hari**. Konfigurasi di `infra/loki/loki-config.yaml`.

### Service Tambahan

| Service | Port | RAM Limit |
|---------|:----:|:---------:|
| Loki | 3100 | 64 MB |
| Fluent Bit | — | 32 MB |
| Grafana | 3200 | 80 MB |

Total tambahan RAM: ~176 MB (43% dari 2 GB total).

## Troubleshooting

### Container tidak start
```bash
docker compose ps
docker compose logs [service-name]
```

### Database connection error
Pastikan `DATABASE_URL` di `.env` benar (host dan port PostgreSQL).

### Log tidak muncul di Grafana
```bash
# Cek Loki ready
curl http://localhost:3100/ready

# Cek Fluent Bit log
docker compose logs fluent-bit

# Cek backend log format (harus JSON 1-baris)
docker compose logs backend | head -5
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
