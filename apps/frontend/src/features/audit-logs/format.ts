// Penerjemah audit log dari kode teknis → bahasa manusia.
// Menangani DUA format action:
//   - Baru (interceptor sudah diperbaiki): PRODUCTS_CREATE, PRODUCTS_DELETE, ...
//   - Lama/historis: API_PRODUCTS, API_DELETE, API_AUTH, ...
// Plus event manual: USER_LOGIN, USER_LOGIN_FAILED, USER_LOGOUT, TRANSACTION_VOID, dll.

export type ActionTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export interface ActionMeta {
  /** Kalimat aktivitas yang ramah, mis. "Menambah produk". */
  label: string;
  tone: ActionTone;
  /** Nama ikon lucide (di-resolve di komponen). */
  icon: 'login' | 'logout' | 'alert' | 'plus' | 'edit' | 'trash' | 'void' | 'box' | 'activity';
}

// Resource teknis → label Indonesia.
const RESOURCE_LABEL: Record<string, string> = {
  user: 'Pengguna',
  users: 'Pengguna',
  product: 'Produk',
  products: 'Produk',
  category: 'Kategori',
  categories: 'Kategori',
  outlet: 'Outlet',
  outlets: 'Outlet',
  transaction: 'Transaksi',
  transactions: 'Transaksi',
  inventory: 'Stok',
  shift: 'Shift',
  shifts: 'Shift',
  auth: 'Autentikasi',
  price: 'Harga',
  prices: 'Harga',
  api: 'Sistem',
};

export function resourceLabel(resource?: string | null): string {
  if (!resource) return '—';
  return RESOURCE_LABEL[resource.toLowerCase()] ?? capitalize(resource);
}

// Event eksplisit (manual log) → meta tetap.
const EXPLICIT: Record<string, ActionMeta> = {
  USER_LOGIN: { label: 'Login berhasil', tone: 'success', icon: 'login' },
  USER_LOGIN_FAILED: { label: 'Login gagal', tone: 'danger', icon: 'alert' },
  USER_LOGOUT: { label: 'Logout', tone: 'neutral', icon: 'logout' },
  TRANSACTION_VOID: { label: 'Membatalkan transaksi', tone: 'danger', icon: 'void' },
  STOCK_ADJUSTMENT_CREATE: { label: 'Menyesuaikan stok', tone: 'warning', icon: 'box' },
  STOCK_TRANSFER_APPROVED: { label: 'Menyetujui transfer stok', tone: 'info', icon: 'box' },
  STOCK_TRANSFER_REJECTED: { label: 'Menolak transfer stok', tone: 'danger', icon: 'box' },
  STOCK_TRANSFER_CANCELLED: { label: 'Membatalkan transfer stok', tone: 'warning', icon: 'box' },
};

// Kata kerja per akhiran action.
const VERB: Record<string, { label: string; tone: ActionTone; icon: ActionMeta['icon'] }> = {
  CREATE: { label: 'Menambah', tone: 'success', icon: 'plus' },
  UPDATE: { label: 'Mengubah', tone: 'info', icon: 'edit' },
  DELETE: { label: 'Menghapus', tone: 'danger', icon: 'trash' },
  VOID: { label: 'Membatalkan', tone: 'danger', icon: 'void' },
};

/** Terjemahkan action mentah menjadi meta yang ramah. */
export function actionMeta(action: string, resource?: string | null): ActionMeta {
  if (EXPLICIT[action]) return EXPLICIT[action];

  // Format lama: API_DELETE / API_PRODUCTS / API_AUTH → pakai resource dari kolom.
  if (action.startsWith('API_')) {
    const tail = action.slice(4); // DELETE / PRODUCTS / AUTH / USERS
    const verb = VERB[tail];
    const res = resourceLabel(resource).toLowerCase();
    if (verb) return { label: `${verb.label} ${res}`, tone: verb.tone, icon: verb.icon };
    // API_PRODUCTS dsb (tanpa verb jelas) → anggap aktivitas umum.
    return { label: `Aktivitas ${resourceLabel(tail)}`, tone: 'neutral', icon: 'activity' };
  }

  // Format baru: PRODUCTS_CREATE / PRODUCT_UPDATE / TRANSACTIONS_VOID
  const parts = action.split('_');
  const verbKey = parts[parts.length - 1];
  const verb = VERB[verbKey];
  const resKey = parts.slice(0, -1).join('_').toLowerCase();
  const res = resourceLabel(resKey || resource);
  if (verb) return { label: `${verb.label} ${res.toLowerCase()}`, tone: verb.tone, icon: verb.icon };

  // Fallback: tampilkan apa adanya tapi diperhalus.
  return { label: prettify(action), tone: 'neutral', icon: 'activity' };
}

const TONE_CLASS: Record<ActionTone, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-600',
};

export function toneClass(tone: ActionTone): string {
  return TONE_CLASS[tone];
}

// Field teknis (di old/new value) → label Indonesia untuk tabel detail.
const FIELD_LABEL: Record<string, string> = {
  role: 'Peran',
  outletId: 'Outlet',
  name: 'Nama',
  sku: 'SKU',
  barcode: 'Barcode',
  status: 'Status',
  sellPrice: 'Harga jual',
  costPrice: 'HPP',
  unit: 'Satuan',
  categoryId: 'Kategori',
  imageUrl: 'Gambar',
  description: 'Deskripsi',
  quantity: 'Jumlah',
  email: 'Email',
};

export function fieldLabel(key: string): string {
  return FIELD_LABEL[key] ?? prettify(key);
}

/** Nilai apa pun → string yang enak dibaca. */
export function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettify(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
