/**
 * Tipe & mapper MURNI untuk laporan — TANPA dependensi transport (axios/fetch).
 *
 * Dipakai oleh dua sisi:
 * - Client: `features/reports/api.ts` (axios) — interaktivitas lama yang masih ada.
 * - Server: `features/reports/server.ts` (serverFetch) — halaman RSC.
 *
 * Karena modul ini tidak `'use client'` dan tidak mengimpor `@/lib/api`, ia aman
 * diimpor dari Server Component tanpa menyeret bundel klien (mis. axios) ke server.
 * Mapper menormalkan penamaan field backend yang bervariasi (`total` vs `revenue`).
 */

type Num = number | string | null | undefined;

export type ReportPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

/** Rentang tanggal eksplisit (dipakai mode Custom di halaman laporan). */
export interface DateRange {
  startDate: string;
  endDate: string;
}

// ---- Bentuk respons mentah backend (longgar, dinormalkan mapper) ----

export interface RawPaymentBreakdown {
  paymentMethod?: string;
  method?: string;
  count?: Num;
  total?: Num;
}

export interface RawDailyBreakdown {
  date?: string;
  total?: Num;
  revenue?: Num;
  count?: Num;
  transactions?: Num;
}

export interface RawSalesSummary {
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

export interface RawTopProduct {
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

export interface RawShiftItem {
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

// ---- Bentuk ternormalisasi (dipakai UI) ----

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

export interface SalesSummaryWithGrowth extends SalesSummary {
  /** % perubahan omzet vs periode sebelumnya; null bila tak ada baseline. */
  revenueGrowth: number | null;
  /** Omzet periode sebelumnya (untuk perbandingan); null bila gagal/tak ada. */
  previousRevenue: number | null;
  /** Tren harian periode sebelumnya (untuk overlay grafik). */
  dailyBreakdownPrevious: { date: string; revenue: number; transactions: number }[];
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

export interface OutletSalesItem {
  outletId: string;
  outletName: string;
  revenue: number;
  transactions: number;
  profit: number;
}

export interface HourlySalesPoint {
  hour: number;
  count: number;
  revenue: number;
}

export interface CategorySalesItem {
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  revenue: number;
}

// ---- Util rentang ----

export function periodToDateRange(period: ReportPeriod): DateRange {
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
export function resolveRange(input: ReportPeriod | DateRange): DateRange {
  return typeof input === 'string' ? periodToDateRange(input) : input;
}

/** Geser rentang [start,end] mundur sepanjang durasinya sendiri (periode sebelumnya). */
export function previousRange({ startDate, endDate }: DateRange): DateRange {
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

// ---- Mapper murni (raw → ternormalisasi) ----

export function mapSalesSummary(data: RawSalesSummary): SalesSummary {
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

export function mapTopProducts(list: RawTopProduct[]): TopProduct[] {
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

export function mapShiftItem(s: RawShiftItem): ShiftReportItem {
  return {
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
  };
}

/**
 * Growth omzet vs periode sebelumnya. Tampilkan hanya bila KEDUA periode punya omzet:
 * - sebelumnya 0 → tak ada baseline ("Infinity%")
 * - sekarang 0   → "−100%" membingungkan saat memang belum ada transaksi
 */
export function computeRevenueGrowth(
  current: SalesSummary,
  previous: SalesSummary | null,
): number | null {
  if (previous && previous.totalRevenue > 0 && current.totalRevenue > 0) {
    return ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100;
  }
  return null;
}
