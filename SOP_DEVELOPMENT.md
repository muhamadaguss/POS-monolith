# Standar Operasional Prosedur (SOP) & Keamanan Pengembangan Aplikasi

## 1. Kode & Kolaborasi

- **Naming Convention:** Mengikuti standar best-practice framework yang digunakan di proyek ini.
- **Git Flow:** \* `main` / `master` hanya untuk production-ready code.
  - Fitur baru dikembangkan di branch `feature/nama-fitur`.
  - Perbaikan bug darurat di branch `hotfix/nama-bug`.
- **Commit Message:** Wajib menggunakan format _Conventional Commits_ (contoh: `feat: ...`, `fix: ...`, `refactor: ...`).

## 2. Keamanan Data & Enkripsi

- **Data Kredensial:** Dilarang keras melakukan _hardcode_ pada API Key, password, token, atau secret key di dalam kode sumber. Semua wajib menggunakan Environment Variables (`.env`).
- **Enkripsi Data Sensitif:**
  - Password pengguna wajib di-hash menggunakan algoritma yang aman (seperti Bcrypt atau Argon2).
  - Data personal atau data transaksi sensitif yang disimpan di database wajib dienkripsi (misal: AES-256).
- **Data in Transit:** Semua komunikasi data antar-layanan atau ke client wajib menggunakan enkripsi TLS/HTTPS.

## 3. Validasi & Proteksi Celah Keamanan

- **Sanitasi Input:** Semua input dari user wajib divalidasi secara ketat di sisi backend.
- **Anti-SQLi:** Gunakan Parameterized Queries, Prepared Statements, atau fitur bawaan ORM/ODM untuk interaksi dengan database.
- **Anti-XSS:** Pastikan input teks disanitasi sebelum dirender ke halaman web atau aplikasi.
