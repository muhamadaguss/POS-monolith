import 'server-only';
import { serverFetch } from '@/lib/session';
import {
  type ReportPeriod,
  type DateRange,
  type SalesSummary,
  type SalesSummaryWithGrowth,
  type TopProduct,
  type ShiftReportResult,
  type OutletSalesItem,
  type HourlySalesPoint,
  type CategorySalesItem,
  type RawSalesSummary,
  type RawTopProduct,
  type RawShiftItem,
  resolveRange,
  previousRange,
  mapSalesSummary,
  mapTopProducts,
  mapShiftItem,
  computeRevenueGrowth,
} from './shared';

/**
 * Fetcher laporan untuk SERVER COMPONENT (RSC) — pakai `serverFetch` (DAL),
 * bukan axios. Logika mapping identik dengan `api.ts` (lewat `shared.ts`), hanya
 * transportnya berbeda. Data di-render di server → klien menerima HTML final.
 */

type Num = number | string | null | undefined;

async function fetchSalesSummary(
  range: ReportPeriod | DateRange,
  outletId?: string,
): Promise<SalesSummary> {
  // Sama seperti client: kirim CUSTOM + rentang eksplisit agar rolling-period
  // (bukan kalender) konsisten dengan kartu & produk terlaris.
  const { startDate, endDate } = resolveRange(range);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const data = await serverFetch<RawSalesSummary>(`/reports/sales?${params}`);
  return mapSalesSummary(data);
}

export async function getSalesSummaryWithGrowth(
  range: ReportPeriod | DateRange,
  outletId?: string,
): Promise<SalesSummaryWithGrowth> {
  const resolved = resolveRange(range);
  const prev = previousRange(resolved);

  const [current, previous] = await Promise.all([
    fetchSalesSummary(resolved, outletId),
    // Periode sebelumnya gagal → tanpa baseline (jangan gagalkan halaman).
    fetchSalesSummary(prev, outletId).catch(() => null),
  ]);

  return {
    ...current,
    revenueGrowth: computeRevenueGrowth(current, previous),
    previousRevenue: previous?.totalRevenue ?? null,
    dailyBreakdownPrevious: previous?.dailyBreakdown ?? [],
  };
}

export async function getTopProducts(
  range: ReportPeriod | DateRange,
  outletId: string | undefined,
  limit: number,
): Promise<TopProduct[]> {
  const { startDate, endDate } = resolveRange(range);
  const params = new URLSearchParams({ startDate, endDate, limit: String(limit) });
  if (outletId) params.set('outletId', outletId);
  const data = await serverFetch<RawTopProduct[] | { topProducts: RawTopProduct[] }>(
    `/reports/top-products?${params}`,
  );
  const list: RawTopProduct[] = Array.isArray(data) ? data : (data.topProducts ?? []);
  return mapTopProducts(list);
}

export async function getShiftSummary(
  range: ReportPeriod | DateRange,
  outletId: string | undefined,
  page: number,
  limit: number,
): Promise<ShiftReportResult> {
  const { startDate, endDate } = resolveRange(range);
  const params = new URLSearchParams({
    startDate,
    endDate,
    page: String(page),
    limit: String(limit),
  });
  if (outletId) params.set('outletId', outletId);
  const data = await serverFetch<{ items?: RawShiftItem[]; meta?: ShiftReportResult['meta'] }>(
    `/reports/shifts?${params}`,
  );
  return {
    items: (data.items ?? []).map(mapShiftItem),
    meta: data.meta ?? { total: 0, page, limit, totalPages: 0 },
  };
}

export async function getHourlySales(
  range: ReportPeriod | DateRange,
  outletId?: string,
): Promise<HourlySalesPoint[]> {
  const { startDate, endDate } = resolveRange(range);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const data = await serverFetch<{ hourly?: { hour: number; count: Num; revenue: Num }[] }>(
    `/reports/hourly?${params}`,
  );
  return (data.hourly ?? []).map((h) => ({
    hour: Number(h.hour ?? 0),
    count: Number(h.count ?? 0),
    revenue: Number(h.revenue ?? 0),
  }));
}

export async function getSalesByCategory(
  range: ReportPeriod | DateRange,
  outletId?: string,
): Promise<CategorySalesItem[]> {
  const { startDate, endDate } = resolveRange(range);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const data = await serverFetch<{
    categories?: { categoryId: string | null; categoryName: string; quantity: Num; revenue: Num }[];
  }>(`/reports/by-category?${params}`);
  return (data.categories ?? []).map((c) => ({
    categoryId: c.categoryId ?? null,
    categoryName: c.categoryName ?? 'Tanpa Kategori',
    quantity: Number(c.quantity ?? 0),
    revenue: Number(c.revenue ?? 0),
  }));
}

export async function getSalesByOutlet(
  range: ReportPeriod | DateRange,
  outletId?: string,
): Promise<OutletSalesItem[]> {
  const { startDate, endDate } = resolveRange(range);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const data = await serverFetch<{
    outlets?: {
      outletId: string;
      outletName: string;
      revenue: Num;
      transactions: Num;
      profit: Num;
    }[];
  }>(`/reports/by-outlet?${params}`);
  return (data.outlets ?? []).map((o) => ({
    outletId: o.outletId,
    outletName: o.outletName,
    revenue: Number(o.revenue ?? 0),
    transactions: Number(o.transactions ?? 0),
    profit: Number(o.profit ?? 0),
  }));
}
