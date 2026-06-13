import 'server-only';
import { serverFetch } from '@/lib/session';
import {
  getSalesSummaryWithGrowth,
  getTopProducts,
  getHourlySales,
  getSalesByCategory,
} from '@/features/reports/server';
import type {
  SalesSummaryWithGrowth,
  TopProduct,
  HourlySalesPoint,
  CategorySalesItem,
  ReportPeriod,
} from '@/features/reports/shared';
import type { Shift } from '@/features/shifts/types';
import type { Transaction, TransactionListResult } from '@/features/pos/types';

/**
 * Fetcher Dashboard untuk SERVER COMPONENT (RSC). Dua mode:
 * - Manager/Owner: KPI + tren + chart + produk terlaris (reuse `reports/server`).
 * - Kasir: shift aktif + statistik transaksi hari ini.
 *
 * Semua via `serverFetch` (DAL) — data ter-render di server.
 */

export interface ManagerDashboardData {
  summary: SalesSummaryWithGrowth;
  topProducts: TopProduct[];
  hourly: HourlySalesPoint[];
  categories: CategorySalesItem[];
}

export async function getManagerDashboard(
  period: ReportPeriod,
  outletId?: string,
): Promise<ManagerDashboardData> {
  const [summary, topProducts, hourly, categories] = await Promise.all([
    getSalesSummaryWithGrowth(period, outletId),
    getTopProducts(period, outletId, 10),
    getHourlySales(period, outletId),
    getSalesByCategory(period, outletId),
  ]);
  return { summary, topProducts, hourly, categories };
}

/** Shift aktif di outlet (null bila tak ada / 404). */
async function getActiveShift(outletId: string): Promise<Shift | null> {
  try {
    return await serverFetch<Shift>(`/shifts/active?outletId=${outletId}`);
  } catch (err) {
    // 404 = tidak ada shift aktif → null; error lain dibiarkan naik (ditangani error.tsx).
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export interface CashierStats {
  totalTransactions: number;
  totalRevenue: number;
}

/**
 * Statistik transaksi kasir HARI INI di satu outlet (jumlah & omzet transaksi
 * COMPLETED). Memparalelkan halaman setelah halaman pertama (mirror pola client).
 */
async function getCashierDailyStats(outletId: string): Promise<CashierStats> {
  const today = new Date().toISOString().slice(0, 10);
  const qs = (page: number) =>
    `/transactions?outletId=${outletId}&startDate=${today}&endDate=${today}&page=${page}&limit=100`;

  const firstPage = await serverFetch<TransactionListResult>(qs(1));
  let items: Transaction[] = [...firstPage.items];

  const { totalPages } = firstPage.meta;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        serverFetch<TransactionListResult>(qs(i + 2)),
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

export interface CashierDashboardData {
  shift: Shift | null;
  stats: CashierStats;
}

export async function getCashierDashboard(outletId: string): Promise<CashierDashboardData> {
  const [shift, stats] = await Promise.all([
    getActiveShift(outletId),
    getCashierDailyStats(outletId),
  ]);
  return { shift, stats };
}
