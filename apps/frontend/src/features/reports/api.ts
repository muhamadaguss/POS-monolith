import { api } from '@/lib/api';

/**
 * Bentuk respons mentah dari endpoint /reports/*. Backend memakai penamaan field
 * yang sedikit bervariasi (mis. `total` vs `revenue`, `count` vs `transactions`),
 * jadi tipe ini sengaja longgar (semua opsional) dan dinormalkan oleh mapper di
 * bawah. Mengganti `any` agar tetap type-safe tanpa memaksa kontrak kaku.
 */
type Num = number | string | null | undefined;

interface RawPaymentBreakdown {
  paymentMethod?: string;
  method?: string;
  count?: Num;
  total?: Num;
}

interface RawDailyBreakdown {
  date?: string;
  total?: Num;
  revenue?: Num;
  count?: Num;
  transactions?: Num;
}

interface RawSalesSummary {
  summary?: Record<string, Num>;
  totalTransactions?: Num;
  totalRevenue?: Num;
  totalDiscount?: Num;
  totalTax?: Num;
  totalSubtotal?: Num;
  voidedTransactions?: Num;
  voidedCount?: Num;
  paymentBreakdown?: RawPaymentBreakdown[];
  dailyBreakdown?: RawDailyBreakdown[];
}

interface RawTopProduct {
  productId?: string;
  productName?: string;
  variantName?: string | null;
  totalQuantity?: Num;
  quantitySold?: Num;
  totalRevenue?: Num;
  revenue?: Num;
  totalCost?: Num;
  hpp?: Num;
  marginPercent?: Num;
  margin?: Num;
  imageUrl?: string | null;
}

interface RawShiftItem {
  id: string;
  outlet?: { name?: string };
  openedBy?: { name?: string };
  closedBy?: { name?: string };
  status: string;
  openedAt: string;
  closedAt?: string | null;
  openingCash?: Num;
  closingCash?: Num;
  cashDifference?: Num;
  salesTotal?: Num;
  salesCount?: Num;
}

/** Ekstrak pesan error API yang ramah. */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg ?? fallback;
}

export interface SalesSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  /** Nilai sebelum pajak — dipakai menghitung tarif pajak efektif. */
  totalSubtotal: number;
  netRevenue: number;
  voidedCount: number;
  paymentBreakdown: { method: string; count: number; total: number }[];
  dailyBreakdown: { date: string; revenue: number; transactions: number }[];
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  hpp: number;
  margin: number;
  /** Gambar produk terkini; null bila tak ada → frontend pakai avatar inisial. */
  imageUrl: string | null;
}

export interface ShiftReportItem {
  id: string;
  outletName: string;
  cashierName: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  cashDifference: number;
  salesTotal: number;
  salesCount: number;
}

export interface ShiftReportResult {
  items: ShiftReportItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type ReportPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

/** Rentang tanggal eksplisit (dipakai mode Custom di halaman laporan). */
export interface DateRange {
  startDate: string;
  endDate: string;
}

function periodToDateRange(period: ReportPeriod): DateRange {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const endDate = fmt(today);

  if (period === 'TODAY') return { startDate: endDate, endDate };

  const start = new Date(today);
  if (period === 'WEEK') start.setDate(today.getDate() - 6);
  else if (period === 'MONTH') start.setDate(today.getDate() - 29);

  return { startDate: fmt(start), endDate };
}

/** Terima preset period (rolling) ATAU rentang eksplisit (mode Custom). */
function resolveRange(input: ReportPeriod | DateRange): DateRange {
  return typeof input === 'string' ? periodToDateRange(input) : input;
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

  const s = (data.summary ?? data) as Record<string, Num>;
  return {
    totalTransactions: Number(s.totalTransactions ?? 0),
    totalRevenue: Number(s.totalRevenue ?? 0),
    totalDiscount: Number(s.totalDiscount ?? 0),
    totalTax: Number(s.totalTax ?? 0),
    totalSubtotal: Number(s.totalSubtotal ?? 0),
    netRevenue: Number(s.totalRevenue ?? 0) - Number(s.totalDiscount ?? 0),
    voidedCount: Number(s.voidedTransactions ?? s.voidedCount ?? 0),
    paymentBreakdown: (data.paymentBreakdown ?? []).map((p) => ({
      method: p.paymentMethod ?? p.method ?? '',
      count: Number(p.count ?? 0),
      total: Number(p.total ?? 0),
    })),
    dailyBreakdown: (data.dailyBreakdown ?? []).map((d) => ({
      date: d.date ?? '',
      revenue: Number(d.total ?? d.revenue ?? 0),
      transactions: Number(d.count ?? d.transactions ?? 0),
    })),
  };
}

/** Geser rentang [start,end] mundur sepanjang durasinya sendiri (periode sebelumnya). */
function previousRange({ startDate, endDate }: DateRange): DateRange {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1; // inklusif
  const prevEnd = new Date(start);
  prevEnd.setDate(start.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(prevStart), endDate: fmt(prevEnd) };
}

export interface SalesSummaryWithGrowth extends SalesSummary {
  /** % perubahan omzet vs periode sebelumnya; null bila tak ada baseline. */
  revenueGrowth: number | null;
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

  // Tampilkan growth hanya bila kedua periode punya omzet:
  // - periode sebelumnya 0 → tak ada baseline ("Infinity%")
  // - periode ini 0        → "−100%" membingungkan saat memang belum ada transaksi
  let revenueGrowth: number | null = null;
  if (previous && previous.totalRevenue > 0 && current.totalRevenue > 0) {
    revenueGrowth =
      ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100;
  }

  return { ...current, revenueGrowth };
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
  return list.map((p) => ({
    productId: p.productId ?? '',
    productName: p.variantName ? `${p.productName} (${p.variantName})` : (p.productName ?? ''),
    quantitySold: Number(p.totalQuantity ?? p.quantitySold ?? 0),
    revenue: Number(p.totalRevenue ?? p.revenue ?? 0),
    hpp: Number(p.totalCost ?? p.hpp ?? 0),
    margin: Number(p.marginPercent ?? p.margin ?? 0),
    imageUrl: p.imageUrl ?? null,
  }));
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
    items: (data.items ?? []).map((s) => ({
      id: s.id,
      outletName: s.outlet?.name ?? '—',
      cashierName: s.openedBy?.name ?? s.closedBy?.name ?? '—',
      status: s.status,
      openedAt: s.openedAt,
      closedAt: s.closedAt ?? null,
      openingCash: Number(s.openingCash ?? 0),
      closingCash: s.closingCash != null ? Number(s.closingCash) : null,
      cashDifference: Number(s.cashDifference ?? 0),
      salesTotal: Number(s.salesTotal ?? 0),
      salesCount: Number(s.salesCount ?? 0),
    })),
    meta: data.meta ?? { total: 0, page, limit, totalPages: 0 },
  };
}

// ---- Penjualan per Jam ----

export interface HourlySalesPoint {
  hour: number;
  count: number;
  revenue: number;
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

// ---- Penjualan per Kategori ----

export interface CategorySalesItem {
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  revenue: number;
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
