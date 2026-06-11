import { api } from '@/lib/api';
import type {
  Category,
  Product,
  Discount,
  CheckoutPayload,
  ActiveShift,
  TransactionListResult,
  TransactionQuery,
} from './types';

export async function fetchCategories(outletId: string): Promise<Category[]> {
  const { data } = await api.get<Category[]>(`/categories?outletId=${outletId}`);
  return data;
}

export async function fetchProducts(outletId: string, search?: string, categoryId?: string): Promise<Product[]> {
  const params = new URLSearchParams({ outletId });
  if (search) params.set('search', search);
  if (categoryId && categoryId !== 'ALL') params.set('categoryId', categoryId);
  const { data } = await api.get<Product[]>(`/products/pos-catalog?${params}`);
  return data;
}

/** Ambil tarif pajak outlet (desimal, mis. 0.11). Default 0 bila gagal. */
export async function fetchOutletTaxRate(outletId: string): Promise<number> {
  try {
    const { data } = await api.get<{ taxRate: number | string }>(`/outlets/${outletId}`);
    return Number(data.taxRate ?? 0);
  } catch {
    return 0;
  }
}

export async function fetchActiveShift(outletId: string): Promise<ActiveShift | null> {
  try {
    const { data } = await api.get<ActiveShift>(`/shifts/active?outletId=${outletId}`);
    return data;
  } catch {
    return null;
  }
}

export async function checkout(payload: CheckoutPayload) {
  const { data } = await api.post('/transactions', payload);
  return data;
}

/** Daftar transaksi (riwayat) untuk outlet + rentang tanggal, terpaginasi. */
export async function fetchTransactions(query: TransactionQuery): Promise<TransactionListResult> {
  const params = new URLSearchParams({
    outletId: query.outletId,
    startDate: query.startDate,
    endDate: query.endDate,
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.status) params.set('status', query.status);
  const { data } = await api.get<TransactionListResult>(`/transactions?${params}`);
  return data;
}

/** Batalkan (void) transaksi — butuh alasan + PIN manager. Stok dikembalikan di server. */
export async function voidTransaction(
  id: string,
  payload: { voidReason: string; managerPin: string },
): Promise<void> {
  await api.post(`/transactions/${id}/void`, payload);
}

/** Refund transaksi — butuh alasan + PIN manager. Stok dikembalikan di server. */
export async function refundTransaction(
  id: string,
  payload: { refundReason: string; managerPin: string },
): Promise<void> {
  await api.post(`/transactions/${id}/refund`, payload);
}

export interface CashierDailyStats {
  totalTransactions: number;
  totalRevenue: number;
}

/**
 * Statistik transaksi kasir untuk HARI INI di satu outlet: jumlah transaksi
 * COMPLETED + total omzet. Mengambil seluruh halaman (limit 100/halaman) lalu
 * mengagregasi di klien — dipakai dashboard kasir.
 */
export async function fetchCashierDailyStats(outletId: string): Promise<CashierDailyStats> {
  const today = new Date().toISOString().slice(0, 10);
  const baseQuery = { outletId, startDate: today, endDate: today, limit: 100 };

  const firstPage = await fetchTransactions({ ...baseQuery, page: 1 });
  let items = [...firstPage.items];

  const { totalPages } = firstPage.meta;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetchTransactions({ ...baseQuery, page: i + 2 }),
      ),
    );
    rest.forEach((p) => (items = items.concat(p.items)));
  }

  const completed = items.filter((t) => t.status === 'COMPLETED');
  return {
    totalTransactions: completed.length,
    totalRevenue: completed.reduce((sum, t) => sum + Number(t.totalAmount), 0),
  };
}
