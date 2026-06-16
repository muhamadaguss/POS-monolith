import { api } from '@/lib/api';

/**
 * Lapisan API + tipe untuk Transfer Stok antar-outlet (Client Component).
 * Backend: `/inventory/transfers` (GET daftar, POST ajukan, PATCH proses).
 * Alur status: PENDING → APPROVED / REJECTED (oleh outlet tujuan) / CANCELLED
 * (oleh pengaju). Stok baru berpindah saat APPROVED.
 */

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface OutletRef {
  id: string;
  name: string;
}

export interface UserRef {
  id: string;
  name: string;
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

interface RawTransferItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number | string;
}

interface RawTransfer {
  id: string;
  status: TransferStatus;
  note: string | null;
  fromOutlet: OutletRef;
  toOutlet: OutletRef;
  requestedBy: UserRef | null;
  approvedBy: UserRef | null;
  requestedAt: string;
  processedAt: string | null;
  items: RawTransferItem[];
}

function mapTransfer(t: RawTransfer): StockTransfer {
  return {
    ...t,
    items: t.items.map((i) => ({ ...i, quantity: Number(i.quantity) })),
  };
}

/** Daftar transfer (50 terbaru). `outletId` opsional untuk filter satu cabang. */
export async function listTransfers(outletId?: string): Promise<StockTransfer[]> {
  const params = new URLSearchParams();
  if (outletId) params.set('outletId', outletId);
  const qs = params.toString();
  const { data } = await api.get<RawTransfer[]>(`/inventory/transfers${qs ? `?${qs}` : ''}`);
  return data.map(mapTransfer);
}

/** Ajukan transfer baru (status awal PENDING). */
export async function createTransfer(payload: CreateTransferPayload): Promise<StockTransfer> {
  const { data } = await api.post<RawTransfer>('/inventory/transfers', payload);
  return mapTransfer(data);
}

/** Proses transfer PENDING: terima / tolak / batalkan. */
export async function processTransfer(
  id: string,
  payload: ProcessTransferPayload,
): Promise<StockTransfer> {
  const { data } = await api.patch<RawTransfer>(`/inventory/transfers/${id}`, payload);
  return mapTransfer(data);
}
