/**
 * Tipe + helper murni untuk Transfer Stok antar-outlet.
 * Daftar di-fetch via Server Component (features/inventory/server.ts); mutasi
 * via Server Actions (features/inventory/actions.ts). Tidak ada panggilan
 * client langsung di sini agar aman diimpor dari RSC maupun client.
 */

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface OutletRef {
  id: string;
  name: string;
}

export interface UserRef {
  id: string;
  name: string;
  role: string | null;
}

export interface StockTransferItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  status: TransferStatus;
  note: string | null;
  fromOutlet: OutletRef;
  toOutlet: OutletRef;
  requestedBy: UserRef | null;
  approvedBy: UserRef | null;
  requestedAt: string;
  processedAt: string | null;
  items: StockTransferItem[];
}

export interface TransferListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransferListResult {
  items: StockTransfer[];
  meta: TransferListMeta;
}

export interface CreateTransferItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CreateTransferPayload {
  fromOutletId: string;
  toOutletId: string;
  note?: string;
  items: CreateTransferItem[];
}

export interface ProcessTransferPayload {
  status: Exclude<TransferStatus, 'PENDING'>;
  note?: string;
}

/** Label & gaya badge per status (PENDING ditampilkan "Diproses", ikut mockup). */
export const TRANSFER_STATUS_META: Record<
  TransferStatus,
  { label: string; dot: string; cls: string }
> = {
  PENDING: { label: 'Diproses', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: 'Diterima', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Ditolak', dot: 'bg-red-500', cls: 'bg-red-50 text-red-600' },
  CANCELLED: { label: 'Dibatalkan', dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-500' },
};

const ROLE_LABEL: Record<string, string> = {
  TENANT_OWNER: 'Pemilik',
  STORE_MANAGER: 'Manajer',
  CASHIER: 'Kasir',
  SUPER_ADMIN: 'Super Admin',
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  return ROLE_LABEL[role] ?? role;
}

/**
 * Nomor transfer untuk TAMPILAN saja (backend tak menyimpannya). Diturunkan
 * dari tanggal pengajuan + 4 karakter terakhir id → mis. "#TRF-20240612-3JRK".
 */
export function displayTransferNo(t: Pick<StockTransfer, 'id' | 'requestedAt'>): string {
  const d = new Date(t.requestedAt);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  const suffix = t.id.slice(-4).toUpperCase();
  return `#TRF-${ymd}-${suffix}`;
}
