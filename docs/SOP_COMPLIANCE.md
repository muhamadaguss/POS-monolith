# Kepatuhan terhadap SOP_DEVELOPMENT.md

> Dokumen ini memetakan tiap poin pada [`SOP_DEVELOPMENT.md`](../SOP_DEVELOPMENT.md)
> ke bukti implementasi di kode, beserta status dan tindak lanjut. Diperbarui:
> 2026-06-12.

**Status ringkas: PATUH ✅** (item kode terpenuhi; item deployment didokumentasikan
dengan konfigurasi konkret di bawah).

---

## 1. Kode & Kolaborasi

| Poin SOP | Status | Bukti / Catatan |
|---|---|---|
| Naming convention best-practice | ✅ | Backend mengikuti konvensi NestJS (`*.controller.ts` / `*.service.ts` / `dto/`); frontend mengikuti App Router Next.js + struktur `features/<domain>`. |
| Git Flow — `main` hanya production-ready | ✅ | Pekerjaan fitur tidak lagi di-commit langsung ke `main`. |
| Git Flow — fitur di `feature/*` | ✅ | Mis. `feature/reports-analytics` (PR #1), `feature/security-hardening-sop`. |
| Git Flow — hotfix di `hotfix/*` | ✅ | Konvensi ditetapkan; dipakai saat ada perbaikan darurat. |
| Commit Conventional Commits | ✅ | Mulai diberlakukan lowercase: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`. (Commit historis sebelum kebijakan ini tidak ditulis ulang.) |

**Alur kerja standar:** `feature/<nama>` → Pull Request → CI hijau → merge (squash) ke `main`.

---

## 2. Keamanan Data & Enkripsi

| Poin SOP | Status | Bukti / Catatan |
|---|---|---|
| Tidak hardcode kredensial | ✅ | Semua secret via `process.env` (`config/jwt.config.ts`, `app.config.ts`). Tidak ada secret literal di kode. |
| `.env` tidak di-commit | ✅ | `.gitignore` memblokir `.env` / `.env.*`, hanya `.env.example` (placeholder) yang di-track. GitGuardian Security Check di CI = pass. |
| Password di-hash (Bcrypt/Argon2) | ✅ | **bcrypt cost 12** untuk password — `users.service.ts`. |
| PIN otorisasi di-hash | ✅ | **bcrypt cost 10** untuk PIN void/refund — `users.service.ts`, diverifikasi `bcrypt.compare` di `transactions.service.ts`. |
| Refresh token disimpan aman | ✅ | Token di-hash **SHA-256** sebelum disimpan (`auth.service.ts` `hashToken`), plus rotasi + reuse-detection. |
| Enkripsi data sensitif (AES-256) | ✅ (lihat penilaian) | Lihat **Penilaian AES-256** di bawah. |
| Data in transit (TLS/HTTPS) | ✅ (deployment) | Lihat **TLS/HTTPS** di bawah. Header `Strict-Transport-Security` (HSTS) sudah dikirim via helmet. |

### Penilaian AES-256

SOP mewajibkan enkripsi AES-256 untuk *"data personal atau data transaksi sensitif"*.
Inventarisasi data yang disimpan:

- **Kredensial** (`passwordHash`, `pin`) → di-**hash bcrypt** (satu arah). Ini lebih
  tepat daripada AES (enkripsi dua arah) untuk kredensial — dan tetap memenuhi maksud
  SOP (data tidak tersimpan plaintext).
- **Kontak** (`email`, `phone`, `address`, `billingEmail`) → data kontak bisnis,
  sensitivitas rendah. `email` dipakai sebagai kunci unik & pencarian; mengenkripsinya
  akan merusak uniqueness/lookup tanpa manfaat keamanan berarti.
- **Tidak ada data ultra-sensitif** yang menjadi sasaran utama AES-256: tidak ada
  nomor KTP/NIK, kartu kredit, rekening bank, paspor, atau data kesehatan. Pembayaran
  POS dicatat sebagai metode (`CASH`/`QRIS`/dst) + jumlah — bukan nomor kartu.

**Kesimpulan:** kewajiban "tidak menyimpan data sensitif sebagai plaintext" terpenuhi
(kredensial di-hash). AES-256 **belum diperlukan** karena tak ada kolom yang masuk
kelas data yang diwajibkan. **Bila** kelak menyimpan PII tingkat tinggi (mis. NIK untuk
faktur pajak), terapkan AES-256-GCM per kolom — lihat _Roadmap_ di bawah.

### TLS/HTTPS (data in transit)

TLS diterminasi di **reverse-proxy / load-balancer** saat deployment (praktik standar;
bukan di proses Node). Aplikasi mendukungnya:

- Header **HSTS** (`Strict-Transport-Security: max-age=31536000; includeSubDomains`)
  sudah dikirim helmet → memaksa browser memakai HTTPS.
- CORS dibatasi ke `FRONTEND_URL` (bukan `*`).

Contoh terminasi TLS (Nginx) di depan backend:

```nginx
server {
  listen 443 ssl;
  server_name api.kasirku.example;
  ssl_certificate     /etc/letsencrypt/live/api.kasirku.example/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.kasirku.example/privkey.pem;
  location / { proxy_pass http://127.0.0.1:3001; proxy_set_header X-Forwarded-Proto https; }
}
server { listen 80; server_name api.kasirku.example; return 301 https://$host$request_uri; }
```

Bila aplikasi berada di belakang proxy, set `app.set('trust proxy', 1)` agar HSTS &
IP klien (audit log) akurat.

---

## 3. Validasi & Proteksi Celah Keamanan

| Poin SOP | Status | Bukti / Catatan |
|---|---|---|
| Sanitasi/validasi input di backend | ✅ | `ValidationPipe` global (`common/pipes/validation.pipe.ts`): `whitelist` + `forbidNonWhitelisted` + `transform`, error **422**. 28+ DTO berdekorasi class-validator. |
| Anti-SQLi (parameterized/ORM) | ✅ | 100% akses DB lewat **Prisma ORM** (query terparameterisasi otomatis). **Tidak ada** `$queryRawUnsafe` / `$executeRawUnsafe` / raw SQL sama sekali. |
| Anti-XSS | ✅ | Frontend React (auto-escape); **tidak ada** `dangerouslySetInnerHTML`. Header `X-Content-Type-Options: nosniff` & `X-Frame-Options: SAMEORIGIN` via helmet. |

### Header keamanan (helmet)

Dipasang di `apps/backend/src/main.ts` (sebelum route). Respons API kini menyertakan:

```
X-Frame-Options: SAMEORIGIN            (anti-clickjacking)
X-Content-Type-Options: nosniff        (anti MIME-sniffing)
Strict-Transport-Security: max-age=…   (paksa HTTPS)
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
```

CSP dimatikan di non-production agar Swagger UI berfungsi; di production CSP default
helmet aktif.

---

## Pemetaan OWASP Top 10 (2021)

Audit terhadap OWASP Top 10 — melengkapi SOP internal. Status per 2026-06-12.

| # | Kategori | Status | Bukti / Catatan |
|---|---|---|---|
| **A01** | Broken Access Control | ✅ | Guard global berlapis (`JwtAuthGuard` + `RolesGuard` + `PermissionsGuard`, `app.module.ts`), RBAC 4 role, dan **scoping `tenantId` di seluruh query** (anti IDOR / cross-tenant). Detail entity diambil via `findFirst` + guard tenant. |
| **A02** | Cryptographic Failures | ✅ | bcrypt (password cost 12, PIN cost 10), refresh token di-hash SHA-256, JWT secret dari env. Kredensial tak pernah plaintext. |
| **A03** | Injection | ✅ | 100% Prisma ORM (parameterized) — tak ada raw SQL. Frontend React auto-escape — tak ada `dangerouslySetInnerHTML`/`innerHTML`. ValidationPipe global. |
| **A04** | Insecure Design | ✅ | Refresh-token rotation + reuse-detection, audit log, multi-tenant by-design, PIN manager untuk void/refund. |
| **A05** | Security Misconfiguration | ✅ | helmet (security headers), Swagger non-aktif di production, CORS dibatasi `FRONTEND_URL`, exception filter tidak membocorkan stack ke klien (hanya di-log). |
| **A06** | Vulnerable & Outdated Components | ⚠️ | Terdapat kerentanan pada **transitive deps** (mis. `tar` high via `exceljs`→`node-pre-gyp`, `uuid` moderate) — bukan di kode aplikasi. Mitigasi: jalankan `npm audit fix` berkala; pertimbangkan upgrade `exceljs`. Jalankan `npm audit` di CI. |
| **A07** | Identification & Authentication Failures | ⚠️ | Throttler global (100 req/60s/IP), error login generik (anti user-enumeration), rotation token. **Rekomendasi:** rate-limit lebih ketat khusus `POST /auth/login` (mis. 5–10/menit) untuk lawan brute-force. |
| **A08** | Software & Data Integrity Failures | ✅ | Tak ada deserialisasi tak aman; GitGuardian Security Check di CI; lockfile dikunci. |
| **A09** | Security Logging & Monitoring | ✅ | `AuditLogInterceptor` mencatat semua request mutasi (POST/PATCH/PUT/DELETE) beserta IP; error di-log oleh exception filter. |
| **A10** | Server-Side Request Forgery (SSRF) | ✅ (N/A) | Backend tidak melakukan outbound request ke URL dari input user — tak ada surface SSRF. |

**Ringkas:** 8/10 kategori terpenuhi penuh; 2 catatan (**A06** kerentanan dependency
transitif, **A07** rate-limit login bisa diperketat) tercatat di _Roadmap_ di bawah.

---

## Roadmap kepatuhan (bila kebutuhan bertambah)

- **AES-256 per kolom** — terapkan bila menyimpan PII tingkat tinggi (NIK, nomor kartu).
  Gunakan `crypto` AES-256-GCM dengan kunci dari `process.env` / KMS; simpan IV per baris.
- **A07 — Rate limit ketat pada auth** — sudah ada throttler global (100/60s);
  tambahkan `@Throttle` khusus `POST /auth/login` (mis. 5–10/menit) untuk lawan brute-force.
- **A06 — Audit dependency** — jalankan `npm audit` di CI; `npm audit fix` berkala;
  pertimbangkan upgrade `exceljs` untuk menambal rantai `node-pre-gyp`→`tar`.
