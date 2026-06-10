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
