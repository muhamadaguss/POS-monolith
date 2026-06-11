export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface ShiftActiveSummary {
  totalTransactions: number;
  totalSales: number | string;
  totalCash: number | string;
  totalNonCash: number | string;
}

export interface ShiftCloseSummary {
  totalTransactions: number;
  totalSales: number | string;
  totalCashIn: number | string;
  totalCashRefund: number | string;
  openingCash: number | string;
  expectedCash: number | string;
  closingCash: number | string;
  cashDifference: number | string;
}

export interface Shift {
  id: string;
  outletId: string;
  outlet?: { id: string; name: string };
  openedById: string;
  openedBy?: { id: string; name: string; email?: string };
  closedById?: string | null;
  closedBy?: { id: string; name: string; email?: string } | null;
  openingCash: number | string;
  closingCash?: number | string | null;
  expectedCash?: number | string | null;
  cashDifference?: number | string | null;
  status: ShiftStatus;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  summary?: ShiftActiveSummary | ShiftCloseSummary;
}

export interface OpenShiftPayload {
  outletId: string;
  openingCash: number;
  notes?: string;
}

export interface CloseShiftPayload {
  closingCash: number;
  notes?: string;
}

// ---- Riwayat Shift ----

/** Satu baris di daftar riwayat shift (`GET /shifts`). */
export interface ShiftListItem extends Shift {
  _count?: { transactions: number };
}

/** Parameter query untuk `GET /shifts`. */
export interface ShiftQuery {
  outletId?: string;
  status?: ShiftStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ShiftListResponse {
  items: ShiftListItem[];
  meta: PaginationMeta;
}

/** Satu transaksi dalam detail shift (`GET /shifts/:id`). */
export interface ShiftTransaction {
  id: string;
  receiptNumber: string;
  status: string;
  paymentMethod: string;
  totalAmount: number | string;
  createdAt: string;
}

/** Detail shift lengkap (`GET /shifts/:id`). */
export interface ShiftDetail extends Shift {
  transactions: ShiftTransaction[];
  _count?: { transactions: number };
}
