# PRD — Kasirku POS Platform v1.0

**Versi:** 1.0 | **Target MVP:** Q3 2026 | **Status:** Phase 2 Backend ✅ Selesai | **Phase 3:** Frontend Next.js 🔄 Hampir Selesai (sisa: UI Transfer Order)

---

## 1. Overview

**Kasirku** adalah platform Point-of-Sale (POS) berbasis cloud (SaaS) yang dirancang untuk UMKM ritel dan F&B yang memiliki satu atau lebih cabang. Platform ini memungkinkan pengelolaan kasir, stok, laporan, dan staf secara terpusat dan real-time.

### Problem Statement

UMKM yang berkembang menjadi multi-cabang kesulitan:

- Memantau stok dan penjualan antar cabang secara real-time
- Mencegah kecurangan kasir (void tanpa otorisasi, selisih kas)
- Mengelola staf dengan hak akses berbeda per cabang

### Value Proposition

- Satu platform untuk semua cabang — stok, kasir, laporan dalam satu dashboard
- Role-based access per outlet — kasir hanya bisa akses kasir, manager akses laporan
- Audit trail lengkap — setiap aksi sensitif tercatat dengan IP dan timestamp

---

## 2. Target Pengguna & Persona

| Persona              | Deskripsi                  | Kebutuhan Utama                              |
| -------------------- | -------------------------- | -------------------------------------------- |
| **SaaS Super Admin** | Tim internal Kasirku       | Monitor tenant, kelola billing & paket       |
| **Tenant Owner**     | Pemilik bisnis (1+ cabang) | Dashboard analitik multi-cabang, kelola staf |
| **Store Manager**    | Kepala cabang              | Laporan shift, stok opname, approve transfer |
| **Cashier**          | Petugas kasir              | Proses transaksi cepat, buka/tutup shift     |

---

## 3. Tech Stack

| Layer                  | Teknologi                                     |
| ---------------------- | --------------------------------------------- |
| **Backend**            | NestJS (Node.js) + TypeScript                 |
| **ORM**                | Prisma                                        |
| **Database**           | PostgreSQL                                    |
| **Frontend Framework** | Next.js (React) — App Router                  |
| **UI Components**      | Tailwind CSS + Shadcn UI                      |
| **State Management**   | Zustand (with Persist Middleware)             |
| **Auth**               | JWT (Access 15m + Refresh 7d) dengan rotation |
| **API Docs**           | Swagger UI — `/api/docs`                      |
| **Tenant Isolation**   | Shared DB, filter `tenant_id` di semua query  |

---

## 4. Arsitektur Multi-Tenant

- **Model:** Logical Separation — Shared Database, Shared Process, Separate Rows
- **Routing:** Tenant diidentifikasi via `tenantSlug` saat login
- **JWT Payload:** `userId`, `tenantId`, `currentOutletId`, `role`, `permissions[]`
- **Isolasi:** Semua query difilter `tenantId` via Prisma global middleware
- **KPI Isolasi:** 0% cross-tenant data access

---

## 5. RBAC (Role-Based Access Control)

### Hierarki Role

`SUPER_ADMIN > TENANT_OWNER > STORE_MANAGER > CASHIER`

### Aturan Kunci

- Role bisa **berbeda per outlet** dalam satu tenant (via `UserOutletRole`)
- Void transaksi wajib **PIN Manager** — otorisasi berlapis
- Store Manager hanya akses staf & stok **outlet sendiri**
- `RequireAnyPermission(A, B)` = logika OR
- `RequirePermissions(A, B)` = logika AND

### Permission Matrix

| Fitur                        | Super Admin | Owner | Manager | Cashier |
| ---------------------------- | ----------- | ----- | ------- | ------- |
| Kelola tenant                | ✅          | ❌    | ❌      | ❌      |
| Dashboard multi-outlet       | ✅          | ✅    | ❌      | ❌      |
| Laporan & audit log          | ✅          | ✅    | ❌      | ❌      |
| Kelola staf (semua outlet)   | ✅          | ✅    | ❌      | ❌      |
| Kelola staf (outlet sendiri) | ✅          | ✅    | ✅      | ❌      |
| Stok opname & transfer       | ✅          | ✅    | ✅      | ❌      |
| Buka/tutup shift             | ✅          | ✅    | ✅      | ✅      |
| Proses transaksi             | ✅          | ✅    | ✅      | ✅      |
| Void transaksi (+ PIN)       | ✅          | ✅    | ✅      | ❌      |

---

## 6. Domain & Fitur

### 6.1 Auth

- Login dengan `email + password + tenantSlug`
- Super Admin login tanpa `tenantSlug`
- Select outlet setelah login (opsional di login, bisa di-switch)
- Refresh token dengan rotasi (reuse detection — semua token dicabut jika token lama dipakai ulang)
- Logout single device atau all devices
- PIN 6-digit hashed untuk otorisasi void

### 6.2 User Management

- CRUD staf per tenant
- Assign role per outlet (bisa berbeda di tiap cabang)
- Status: `ACTIVE | INACTIVE | LOCKED`

### 6.3 Outlet Management

- CRUD outlet per tenant
- Konfigurasi per outlet: timezone, tax rate, receipt note
- Batas jumlah outlet sesuai paket langganan

### 6.4 Product Catalog

- Produk dengan atau tanpa varian (size, warna, dll)
- SKU unik per tenant
- Harga jual & HPP dikonfigurasi **per outlet** (via `OutletPrice`)
- Kategori produk dengan warna dan urutan tampilan

### 6.5 Inventory

- Stok aktual per produk per outlet
- **Stock Mutation** — immutable log setiap perubahan stok (PURCHASE, SALE, ADJUSTMENT, TRANSFER_IN/OUT, DAMAGE)
- **Stock Opname** — rekonsiliasi stok fisik vs sistem
- **Stock Transfer** — request antar cabang dengan flow `PENDING → APPROVED/REJECTED`
- Alert stok minimum per item

### 6.6 Shift

- Buka shift dengan kas awal
- Tutup shift dengan kas fisik
- Sistem hitung `expectedCash` otomatis dan deteksi `cashDifference`
- Satu shift aktif per outlet setiap waktu

### 6.7 Transactions (POS Core)

- Checkout: pilih produk, tambah ke keranjang, pilih diskon, pilih metode bayar
- Metode bayar: `CASH | DEBIT_CARD | CREDIT_CARD | QRIS | TRANSFER | OTHER`
- Hitung kembalian otomatis
- Potong stok otomatis saat transaksi selesai
- Void transaksi dengan `voidReason` + otorisasi PIN Manager
- Receipt number unik per outlet
- **Snapshot data produk** di `TransactionItem` — harga/nama produk tidak berubah meski catalog diupdate

### 6.8 Discounts

- Tipe: `PERCENTAGE | FIXED_AMOUNT`
- Konfigurasi: minimal pembelian, batas diskon maksimum
- Periode aktif: `startsAt` - `endsAt`

### 6.9 Reports

- Sales summary per outlet/tanggal
- Top products by revenue/quantity
- Shift summary (pendapatan, transaksi, metode bayar)
- Export laporan penjualan ke Excel (.xlsx) — `GET /reports/sales/export` ✅

### 6.10 Audit Log

- Log otomatis semua mutasi (POST/PATCH/PUT/DELETE) via interceptor global
- Log manual dengan konteks kaya untuk event kritis:
  - `USER_LOGIN` / `USER_LOGIN_FAILED` / `USER_LOGOUT`
  - `TRANSACTION_VOID`
  - `STOCK_ADJUSTMENT_CREATE`
  - `STOCK_TRANSFER_APPROVED/REJECTED/CANCELLED`
- Data tersimpan: action, resource, IP address, user agent, old/new value
- Query dengan filter: userId, action, resource, date range

### 6.11 Subscription & Billing

- Paket: `FREE | STARTER | GROWTH | ENTERPRISE`
- Batas outlet dan staf per paket
- Periode trial, status tenant: `ACTIVE | SUSPENDED | TRIAL | CANCELLED`

---

## 7. API Endpoints Summary

| Grup         | Prefix          | Metode Utama                          |
| ------------ | --------------- | ------------------------------------- |
| Auth         | `/auth`         | login, logout, refresh, select-outlet |
| Users        | `/users`        | CRUD, assign outlet role              |
| Outlets      | `/outlets`      | CRUD                                  |
| Categories   | `/categories`   | CRUD                                  |
| Products     | `/products`     | CRUD + varian + harga per outlet      |
| Inventory    | `/inventory`    | stok, opname, transfer                |
| Shifts       | `/shifts`       | buka, tutup, list                     |
| Transactions | `/transactions` | checkout, void, list                  |
| Reports      | `/reports`      | sales, products, shifts, export Excel |
| Audit Logs   | `/audit-logs`   | list dengan filter                    |

Dokumentasi lengkap: `http://localhost:3001/api/docs`

---

## 8. Data Model Kunci

    TENANT
      └── OUTLET (1..N)
            ├── USER_OUTLET_ROLE  ← siapa bisa apa
            ├── OUTLET_PRICE      ← harga per produk
            ├── INVENTORY         ← stok aktual
            ├── SHIFT
            │     └── TRANSACTION
            │           └── TRANSACTION_ITEM (snapshot)
            └── STOCK_ADJUSTMENT

    PRODUCT (master per tenant)
      └── PRODUCT_VARIANT

    STOCK_MUTATION  ← immutable log semua perubahan stok
    AUDIT_LOG       ← immutable log aksi sensitif

ERD lengkap: [packages/database/ERD.md](packages/database/ERD.md)

---

## 9. Non-Functional Requirements

| Aspek                                                | Target                                               |
| ---------------------------------------------------- | ---------------------------------------------------- |
| Data isolation                                       | 0% cross-tenant access                               |
| API response (vital endpoint)                        | < 300ms                                              |
| Transaction processing (bayar → struk + potong stok) | < 2 detik                                            |
| Audit trail                                          | 100% event kritis tercatat                           |
| Security                                             | JWT rotation, bcrypt password, PIN hashed, RLS-ready |

---

## 10. Roadmap & Status

| Phase       | Scope                                                          | Status              |
| ----------- | -------------------------------------------------------------- | ------------------- |
| **Phase 1** | Setup monorepo, database schema, Prisma migration              | ✅ Selesai          |
| **Phase 2** | NestJS Backend — semua API endpoint + AuditLog                 | ✅ Selesai          |
| **Phase 3** | Next.js Frontend — Auth, POS Screen, Manager/Owner Dashboard, Konsol Super Admin | 🔄 Hampir Selesai (sisa: UI Transfer Order antar-outlet) |
| **Phase 4** | Deployment, CI/CD, monitoring                                  | 🔲 Belum            |

---

## 11. Phase 3 — Rencana & Spesifikasi Frontend (Next.js)

### 11.1 Arsitektur & Aturan Main Frontend

- **State Management & Persistence:** Menggunakan Zustand. Khusus untuk `Cart Store` (keranjang belanja kasir) wajib menggunakan middleware _persist_ (disimpan di `localStorage`) agar data item belanja tidak hilang apabila halaman tidak sengaja ter-refresh.
- **Handling Timezone:** Semua komponen manipulasi waktu, log shift, dan struk belanja di frontend wajib diformat berdasarkan konfigurasi `timezone` milik outlet yang sedang aktif (`currentOutletId`), bukan menggunakan zona waktu lokal dari gawai/browser milik kasir.
- **Double Click Prevention:** Tombol eksekusi utama, terutama "Proses Bayar / Checkout", wajib di-disable langsung (atau diberi state _loading_) setelah klik pertama untuk mencegah duplikasi pengiriman data ke API (`race condition`).
- **UI Masking (RBAC):** Frontend membaca _array permissions_ dari payload token JWT. Elemen UI seperti tombol, tab menu, atau halaman utuh wajib disembunyikan atau di-_disable_ jika _user_ tidak memiliki hak akses yang sesuai.

### 11.2 Auth & Onboarding Flow ✅ Selesai

- ✅ **Halaman Login** (`/login`): Field `email`, `password`, `tenantSlug`. Toggle Super Admin menyembunyikan field `tenantSlug`. Validasi via react-hook-form + zod. Error banner dari API.
- ✅ **Zustand `authStore`** (`kasirku-auth` — persist localStorage): Menyimpan `accessToken`, `refreshToken`, `user`, `outlets[]`, `currentOutletId`.
- ✅ **Axios Interceptor Global** (`src/lib/api.ts`): Request inject Bearer token. Response auto-unwrap `{ success, data }`. 401 trigger refresh token otomatis dengan queue race-condition guard. Refresh gagal → clear session → redirect `/login`.
- ✅ **Halaman Select Outlet** (`/select-outlet`): Grid 2-kolom kartu outlet. Klik kartu langsung call `selectOutletApi`, update token + `currentOutletId`, redirect ke dashboard. Redirect ke `/login` jika tidak ada user/outlets.
- ✅ **Auth Guards**: `DashboardLayout` dan `PosLayout` dengan hydration-safe guard (spinner saat re-hydrate) — mencegah false redirect race condition Zustand ↔ localStorage.
- ✅ **Middleware** (`src/middleware.ts`): Redirect `/` → `/login`.
- ✅ **Bug fix navigation**: Ganti `router.push` dengan `window.location.href` setelah set outlet agar Zustand persist ter-flush ke localStorage sebelum layout guard dievaluasi.
- ✅ **Backend fix**: Login response ditambah `outlets[]` (list outlet user) dan `permissions[]` di user object. Response dibungkus `{ success, data }`, di-unwrap oleh Axios interceptor.

### 11.3 POS Screen Layout (Cashier Mode) ✅ Selesai

_Layar kasir dioptimalkan untuk performa tinggi tanpa hambatan klik dan mendukung tampilan lanskap (Tablet/Desktop)._

- ✅ **Split-Screen Layout** (`/pos`):
  - **Kolom Kiri (70% - Katalog Produk):**
    - ✅ Search Bar auto-focus via `useRef + useEffect` — siap terima input barcode scanner.
    - ✅ Debounce search 300ms sebelum query API.
    - ✅ Tab kategori dinamis dari API, warna per kategori, highlight aktif.
    - ✅ Grid produk responsif (2→3→4→5 kolom). Stok = 0 → `opacity-50` + badge "Habis" + disabled klik.
    - ✅ Skeleton loading 10 kotak saat fetch, empty state jika tidak ada produk.
    - ✅ Warning banner jika tidak ada shift aktif.
  - **Kolom Kanan (30% - Sticky Cart):**
    - ✅ `useCartStore` dengan Zustand `persist` (key: `kasirku-cart`) — data tidak hilang saat refresh.
    - ✅ List item + kontrol +/- kuantitas + hapus. Tombol + disabled jika qty ≥ stok.
    - ✅ Kalkulasi real-time: Subtotal → Pajak 11% → Grand Total.
    - ✅ Tombol **"PROSES BAYAR"** hijau besar `h-14`, disabled jika keranjang kosong atau `isPending`, spinner saat loading.
- ✅ **Checkout Dialog (Modal)**:
  - ✅ 6 metode bayar dalam grid (CASH, QRIS, DEBIT, KREDIT, TRANSFER, LAINNYA).
  - ✅ Mode CASH: 4 shortcut pecahan (10rb/20rb/50rb/100rb), input manual, display kembalian `text-3xl font-black`.
  - ✅ Display merah "Kurang: X" jika uang diterima < grand total. Tombol Konfirmasi disabled.
  - ✅ Double-click prevention via `isPending` state.
- ✅ **Mock data** (8 produk, 3 kategori, 2 produk stok 0) via `NEXT_PUBLIC_USE_MOCK=true`.

### 11.4 Dashboard Layout (Manager & Owner Mode) ✅ Sebagian Selesai

_Dashboard menggunakan tata letak standar Web Desktop untuk mempermudah peninjauan data makro._

- ✅ **Sidebar Navigation Layout** (`src/components/shared/Sidebar.tsx`):
  - ✅ Navigasi dikelompokkan: Utama (Dashboard, Kasir POS), Manajemen (Katalog, Inventaris, Karyawan), Laporan (Penjualan, Audit Log), Akun (Billing).
  - ✅ Filter menu berdasarkan `permissions[]` user (UI masking RBAC).
  - ✅ Active state: exact match `/dashboard`, prefix match sub-route.
  - ✅ User info + tombol Logout di bawah sidebar.
- ✅ **Outlet Switcher** (`src/components/shared/OutletSwitcher.tsx`):
  - ✅ Shadcn DropdownMenu di atas sidebar menampilkan outlet aktif + role.
  - ✅ Hanya TENANT_OWNER dan SUPER_ADMIN bisa buka dropdown.
  - ✅ Klik item → call `selectOutletApi` → update `currentOutletId` real-time di store.
- ✅ **Halaman Analytics & Keuangan** (`/dashboard`): KPI Cards (omset, transaksi, HPP, margin), bar chart tren penjualan. _(detail di 11.5)_
- ✅ **Halaman Inventaris & Mutasi** (`/inventory`): Datatable stok, filter kategori, sort low stock, form Stock Opname. _(detail di 11.5)_
- 🔲 **UI Transfer Order antar-outlet**: backend sudah lengkap (`/inventory/transfers` POST/GET + flow status `PENDING → APPROVED/REJECTED`); **halaman frontend belum dibuat** — satu-satunya fitur Phase 3 yang tersisa.
- ✅ **Halaman Audit Log Viewer** (`/audit-log`): Tabel kronologis, modal JSON Diff `old_value` vs `new_value`. _(detail di 11.5)_

### 11.5 Fitur Lanjutan

- ✅ **Shift Management** (`/shift`): Halaman buka shift (input kas awal, catatan), tampilan shift aktif (durasi, info kasir, kas awal), form tutup shift (input kas fisik), rekap hasil tutup shift (kas awal, total tunai masuk, kas diharapkan, kas fisik, selisih berwarna).
- ✅ **Dashboard Analytics** (`/dashboard`): KPI Cards (omset, transaksi, diskon, pajak), bar chart tren penjualan 7 hari, breakdown metode pembayaran dengan progress bar, tabel top produk terlaris dengan margin badge. Filter periode: Hari ini / 7 Hari / 30 Hari.
- ✅ **Inventaris** (`/inventory`): Datatable stok dengan search + filter kategori + sort (nama/stok/status). Row highlight merah/kuning untuk stok habis/rendah. Summary footer (total produk, jumlah habis, jumlah stok rendah). Modal Stock Opname — input stok fisik per produk, submit update ke API.
- ✅ **Audit Log Viewer** (`/audit-log`): Tabel kronologis semua aktivitas sensitif. Filter per tipe aksi. Badge warna per action type. Tombol "Lihat Detail" tiap baris → modal JSON Diff menampilkan `old_value` dan `new_value` dalam format code block.
- ✅ **Sidebar diperbarui**: Tambah link Shift Management, fix semua href ke path aktual (`/inventory`, `/audit-log`, `/shift`), tambah ikon `Clock` dan `Boxes`.
- ✅ **Manajemen Staf** (`/users`): CRUD user, assign role per outlet, reset password & PIN sebagai aksi tersendiri (Owner/Manager).
- ✅ **Void & Refund Transaksi** (`/pos/transactions`): Input alasan + modal PIN manager; stok dikembalikan & status `VOIDED`/`REFUNDED` di server.
- ✅ **Integrasi Diskon**: Apply `discountId` di keranjang, baris diskon tampil di summary keranjang.
- ✅ **Billing & Subscription** (`/billing`): Halaman paket langganan, daftar invoice, bayar invoice.
- ✅ **Export laporan penjualan ke Excel** (`/reports`): tombol "Export Excel" memicu unduhan `.xlsx` dari `/reports/sales/export`.

### 11.6 Konsol Super Admin ✅ Selesai

- ✅ **Manajemen Tenant** (`/admin/tenants`): daftar + filter + detail tenant, provisioning tenant baru, ubah status & paket.
- ✅ **Manajemen User lintas-tenant** (`/admin/users`): KPI + daftar user semua tenant, tambah user, reset kredensial.
- ✅ **Laporan Platform** (`/admin/reports`): pendapatan SaaS, tren bulanan, distribusi paket, pertumbuhan nyata, aktivitas terkini, ekspor Excel.
- ✅ **Gate PIN kasir**: wajib verifikasi PIN setelah login (kasir); kunci akun 3× gagal + auto-unlock 15 menit; paksa set PIN bila belum ada.
