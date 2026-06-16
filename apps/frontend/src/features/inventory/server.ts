import 'server-only';
import { serverFetch } from '@/lib/session';
import type { TransferListResult, TransferStatus } from './transfers';

export interface TransferQuery {
  outletId?: string;
  status?: TransferStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/** Daftar transfer stok (paginasi) untuk Server Component /transfers. */
export async function fetchTransfers(q: TransferQuery): Promise<TransferListResult> {
  const params = new URLSearchParams();
  if (q.outletId) params.set('outletId', q.outletId);
  if (q.status) params.set('status', q.status);
  if (q.search) params.set('search', q.search);
  params.set('page', String(q.page ?? 1));
  params.set('limit', String(q.limit ?? 10));
  return serverFetch<TransferListResult>(`/inventory/transfers?${params}`);
}
