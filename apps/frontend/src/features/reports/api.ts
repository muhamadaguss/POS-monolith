import { api } from '@/lib/api';
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

// Re-export tipe agar konsumen lama (`@/features/reports/api`) tak perlu diubah.
export type {
  ReportPeriod,
  DateRange,
  SalesSummary,
  SalesSummaryWithGrowth,
  TopProduct,
  ShiftReportItem,
  ShiftReportResult,
  OutletSalesItem,
  HourlySalesPoint,
  CategorySalesItem,
} from './shared';

type Num = number | string | null | undefined;

/** Ekstrak pesan error API yang ramah. */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg ?? fallback;
}

export async function getSalesSummary(
  period: ReportPeriod | DateRange = 'WEEK',
  outletId?: string,
): Promise<SalesSummary> {
  // Tombol UI berarti rolling ("Hari ini", "7 Hari", "30 Hari"), BUKAN minggu/
  // bulan kalender. Backend MONTHLY/WEEKLY = kalender, jadi kirim CUSTOM dengan
  // rentang eksplisit agar kartu & "Produk Terlaris" (yang juga rolling) konsisten.
  const { startDate, endDate } = resolveRange(period);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const { data } = await api.get<RawSalesSummary>(`/reports/sales?${params}`);
  return mapSalesSummary(data);
}

/**
 * Ringkasan penjualan + pertumbuhan omzet vs periode sebelumnya.
 * Dihitung di frontend (dua panggilan), tanpa mengubah backend reports.
 */
export async function getSalesSummaryWithGrowth(
  period: ReportPeriod | DateRange = 'WEEK',
  outletId?: string,
): Promise<SalesSummaryWithGrowth> {
  const range = resolveRange(period);
  const prev = previousRange(range);

  const [current, previous] = await Promise.all([
    getSalesSummary(range, outletId),
    // Bila periode sebelumnya gagal, jangan gagalkan dashboard — anggap tanpa baseline.
    getSalesSummary(prev, outletId).catch(() => null),
  ]);

  return {
    ...current,
    revenueGrowth: computeRevenueGrowth(current, previous),
    previousRevenue: previous?.totalRevenue ?? null,
    dailyBreakdownPrevious: previous?.dailyBreakdown ?? [],
  };
}

export async function getSalesByOutlet(
  period: ReportPeriod | DateRange = 'WEEK',
  outletId?: string,
): Promise<OutletSalesItem[]> {
  const { startDate, endDate } = resolveRange(period);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const { data } = await api.get<{
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

export async function getTopProducts(
  period: ReportPeriod | DateRange = 'WEEK',
  outletId?: string,
  limit = 10,
): Promise<TopProduct[]> {
  const { startDate, endDate } = resolveRange(period);
  const params = new URLSearchParams({ startDate, endDate, limit: String(limit) });
  if (outletId) params.set('outletId', outletId);
  const { data } = await api.get<RawTopProduct[] | { topProducts: RawTopProduct[] }>(
    `/reports/top-products?${params}`,
  );

  const list: RawTopProduct[] = Array.isArray(data) ? data : (data.topProducts ?? []);
  return mapTopProducts(list);
}

export async function getShiftSummary(
  period: ReportPeriod | DateRange = 'MONTH',
  outletId?: string,
  page = 1,
  limit = 20,
): Promise<ShiftReportResult> {
  const { startDate, endDate } = resolveRange(period);
  const params = new URLSearchParams({ startDate, endDate, page: String(page), limit: String(limit) });
  if (outletId) params.set('outletId', outletId);
  const { data } = await api.get<{ items?: RawShiftItem[]; meta?: ShiftReportResult['meta'] }>(
    `/reports/shifts?${params}`,
  );

  return {
    items: (data.items ?? []).map(mapShiftItem),
    meta: data.meta ?? { total: 0, page, limit, totalPages: 0 },
  };
}

export async function getHourlySales(
  period: ReportPeriod | DateRange = 'WEEK',
  outletId?: string,
): Promise<HourlySalesPoint[]> {
  const { startDate, endDate } = resolveRange(period);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const { data } = await api.get<{ hourly?: { hour: number; count: Num; revenue: Num }[] }>(
    `/reports/hourly?${params}`,
  );

  return (data.hourly ?? []).map((h) => ({
    hour: Number(h.hour ?? 0),
    count: Number(h.count ?? 0),
    revenue: Number(h.revenue ?? 0),
  }));
}

export async function getSalesByCategory(
  period: ReportPeriod | DateRange = 'WEEK',
  outletId?: string,
): Promise<CategorySalesItem[]> {
  const { startDate, endDate } = resolveRange(period);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);
  const { data } = await api.get<{
    categories?: { categoryId: string | null; categoryName: string; quantity: Num; revenue: Num }[];
  }>(`/reports/by-category?${params}`);

  return (data.categories ?? []).map((c) => ({
    categoryId: c.categoryId ?? null,
    categoryName: c.categoryName ?? 'Tanpa Kategori',
    quantity: Number(c.quantity ?? 0),
    revenue: Number(c.revenue ?? 0),
  }));
}

/** Unduh laporan penjualan sebagai file Excel (.xlsx) — memicu download di browser. */
export async function exportSalesXlsx(
  period: ReportPeriod | DateRange = 'WEEK',
  outletId?: string,
): Promise<void> {
  const { startDate, endDate } = resolveRange(period);
  const params = new URLSearchParams({ period: 'CUSTOM', startDate, endDate });
  if (outletId) params.set('outletId', outletId);

  const { data } = await api.get(`/reports/sales/export?${params}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kasirku-penjualan-${startDate}_${endDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
