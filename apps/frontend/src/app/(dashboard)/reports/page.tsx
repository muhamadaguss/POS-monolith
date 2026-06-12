'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  Percent,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/features/auth/store';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePageFocus } from '@/hooks/usePageFocus';
import {
  getSalesSummaryWithGrowth,
  getTopProducts,
  getShiftSummary,
  getHourlySales,
  getSalesByCategory,
  getSalesByOutlet,
  exportSalesXlsx,
  apiErrorMessage,
} from '@/features/reports/api';
import type {
  SalesSummaryWithGrowth,
  TopProduct,
  ShiftReportResult,
  HourlySalesPoint,
  CategorySalesItem,
  OutletSalesItem,
  ReportPeriod,
  DateRange,
} from '@/features/reports/api';
import {
  SalesTrendChart,
  PaymentBreakdown,
  HourlyBarChart,
  CategoryBreakdown,
  OutletComparisonChart,
} from '@/features/reports/components/charts';
import { IDR } from '@/lib/format';

const PRESETS: { value: ReportPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hari ini' },
  { value: 'WEEK', label: '7 Hari' },
  { value: 'MONTH', label: '30 Hari' },
  { value: 'CUSTOM', label: 'Custom' },
];

type Tab = 'sales' | 'analytics' | 'products' | 'shifts';
const TABS: { value: Tab; label: string }[] = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'analytics', label: 'Analitik' },
  { value: 'products', label: 'Produk Terlaris' },
  { value: 'shifts', label: 'Rekap Shift' },
];

const SHIFT_PAGE_SIZE = 20;
const todayStr = () => new Date().toISOString().slice(0, 10);

/** Badge pertumbuhan (mis. +12,5% / −8%). Disembunyikan bila growth null. */
function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth === null) return null;
  const up = growth >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
      }`}
    >
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}
      {growth.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  /** Elemen di pojok kanan-atas (mis. badge growth). */
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge}
      </div>
      <p className="text-xs text-gray-500 font-medium mt-4">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function dateTime(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ReportsPageInner() {
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const isOwner = user?.role === 'TENANT_OWNER';

  // Owner: pilih cabang ('' = semua). Lainnya: terkunci ke outletnya.
  const [pickedOutletId, setPickedOutletId] = useState('');
  const outletId = isOwner ? pickedOutletId : (user?.currentOutletId ?? '');
  const outletParam = outletId || undefined;

  const [preset, setPreset] = useState<ReportPeriod>('MONTH');
  const [customStart, setCustomStart] = useState(todayStr());
  const [customEnd, setCustomEnd] = useState(todayStr());

  // Rentang efektif yang dikirim ke API. Preset → string period; Custom → DateRange.
  const range: ReportPeriod | DateRange = useMemo(
    () => (preset === 'CUSTOM' ? { startDate: customStart, endDate: customEnd } : preset),
    [preset, customStart, customEnd],
  );

  const [tab, setTab] = useState<Tab>('sales');

  const [summary, setSummary] = useState<SalesSummaryWithGrowth | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topLimit, setTopLimit] = useState(10);
  const [shiftData, setShiftData] = useState<ShiftReportResult | null>(null);
  const [shiftPage, setShiftPage] = useState(1);
  const [hourly, setHourly] = useState<HourlySalesPoint[]>([]);
  const [categories, setCategories] = useState<CategorySalesItem[]>([]);
  const [outletSales, setOutletSales] = useState<OutletSalesItem[]>([]);
  const [compareTrend, setCompareTrend] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, t, sh, hr, cat, outlet] = await Promise.all([
        getSalesSummaryWithGrowth(range, outletParam),
        getTopProducts(range, outletParam, topLimit),
        getShiftSummary(range, outletParam, shiftPage, SHIFT_PAGE_SIZE),
        getHourlySales(range, outletParam),
        getSalesByCategory(range, outletParam),
        getSalesByOutlet(range, outletParam),
      ]);
      setSummary(s);
      setTopProducts(t);
      setShiftData(sh);
      setHourly(hr);
      setCategories(cat);
      setOutletSales(outlet);
    } catch {
      // 401/refresh ditangani interceptor; jangan jadi unhandledRejection.
    } finally {
      setIsLoading(false);
    }
  }, [range, outletParam, topLimit, shiftPage]);

  useEffect(() => {
    load();
  }, [load]);

  usePageFocus(load);

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      await exportSalesXlsx(range, outletParam);
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal mengunduh Excel.'));
    } finally {
      setExporting(false);
    }
  }

  const profit = useMemo(
    () => topProducts.reduce((sum, p) => sum + (p.revenue - p.hpp), 0),
    [topProducts],
  );

  // Persentase void (dari total termasuk void) & margin kotor (profit/omzet).
  const voidPct = useMemo(() => {
    const total = (summary?.totalTransactions ?? 0) + (summary?.voidedCount ?? 0);
    if (total === 0) return 0;
    return Math.round(((summary?.voidedCount ?? 0) / total) * 100);
  }, [summary]);

  const marginPct = useMemo(() => {
    if (!summary || summary.totalRevenue <= 0) return null;
    return Math.round((profit / summary.totalRevenue) * 100);
  }, [summary, profit]);

  // Net revenue = penjualan kotor − diskon (pajak adalah titipan, bukan pendapatan).
  const netRevenue = (summary?.totalRevenue ?? 0) - (summary?.totalDiscount ?? 0);

  // Label periode untuk header chart: "Mei 2026" (preset) / rentang (custom).
  const trendLabel = useMemo(() => {
    if (preset === 'CUSTOM') {
      const fmt = (d: string) =>
        new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return `${fmt(customStart)} – ${fmt(customEnd)}`;
    }
    const days = summary?.dailyBreakdown ?? [];
    const anchor = days.length ? new Date(days[days.length - 1].date) : new Date();
    return anchor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [preset, customStart, customEnd, summary]);

  return (
    <div className="space-y-5">
      {/* Header + kontrol */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analisis penjualan, produk, &amp; shift.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && outlets.length > 0 && (
            <select
              value={pickedOutletId}
              onChange={(e) => setPickedOutletId(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            >
              <option value="">Semua Cabang</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  preset === p.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon-lg" onClick={load} title="Muat ulang">
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export Excel
          </Button>
        </div>
      </div>

      {/* Custom date range */}
      {preset === 'CUSTOM' && (
        <div className="flex items-end gap-3 flex-wrap rounded-xl border border-gray-200 bg-white p-3">
          <div>
            <Label htmlFor="r-from" className="mb-1 text-xs text-gray-500">
              Dari
            </Label>
            <Input
              id="r-from"
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="r-to" className="mb-1 text-xs text-gray-500">
              Sampai
            </Label>
            <Input
              id="r-to"
              type="date"
              value={customEnd}
              min={customStart}
              max={todayStr()}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading && !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))
        ) : (
          <>
            <KpiCard
              icon={TrendingUp}
              label="Total Omset"
              value={IDR.format(summary?.totalRevenue ?? 0)}
              sub={`${summary?.totalTransactions ?? 0} transaksi`}
              color="bg-emerald-100 text-emerald-600"
              badge={<GrowthBadge growth={summary?.revenueGrowth ?? null} />}
            />
            <KpiCard
              icon={ShoppingCart}
              label="Total Transaksi"
              value={String(summary?.totalTransactions ?? 0)}
              sub={`${summary?.voidedCount ?? 0} Void (${voidPct}%)`}
              color="bg-blue-100 text-blue-600"
            />
            <KpiCard
              icon={Receipt}
              label="Rata-rata / Transaksi"
              value={IDR.format(
                summary && summary.totalTransactions > 0
                  ? Math.round(summary.totalRevenue / summary.totalTransactions)
                  : 0,
              )}
              sub="Nilai belanja per struk"
              color="bg-amber-100 text-amber-600"
            />
            <KpiCard
              icon={Percent}
              label="Estimasi Profit"
              value={IDR.format(profit)}
              sub={marginPct !== null ? `Margin kotor: ${marginPct}%` : 'dari produk terlaris'}
              color="bg-purple-100 text-purple-600"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.value
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Penjualan */}
      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-900">
                  Tren Penjualan{' '}
                  <span className="font-normal text-gray-400">({trendLabel})</span>
                </p>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={compareTrend}
                    onChange={(e) => setCompareTrend(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Bandingkan periode sebelumnya
                </label>
              </div>
              {compareTrend && summary && summary.previousRevenue !== null && (
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded bg-emerald-500" /> Periode ini
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded bg-gray-300" /> Periode sebelumnya
                  </span>
                  <span className="ml-auto">
                    Sebelumnya: <span className="font-semibold text-gray-700">{IDR.format(summary.previousRevenue)}</span>
                  </span>
                </div>
              )}
              <SalesTrendChart
                data={summary?.dailyBreakdown ?? []}
                previousData={compareTrend ? summary?.dailyBreakdownPrevious : undefined}
              />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Metode Pembayaran</p>
              <PaymentBreakdown data={summary?.paymentBreakdown ?? []} />
            </div>
          </div>

          {/* Ringkasan keuangan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-gray-400">Total Penjualan Kotor</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">
                    {IDR.format(summary?.totalRevenue ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Diskon</p>
                  <p className="text-base font-bold text-red-600 tabular-nums">
                    {(summary?.totalDiscount ?? 0) > 0 ? '- ' : ''}
                    {IDR.format(summary?.totalDiscount ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Pajak (PB1)</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">
                    {IDR.format(summary?.totalTax ?? 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Net Revenue</p>
                <p className="text-2xl font-black text-emerald-600 tabular-nums">
                  {IDR.format(netRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Analitik (per jam + per kategori) */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-900">Penjualan per Jam</p>
              <span className="text-xs text-gray-400">Jam ramai disorot hijau pekat</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Distribusi omzet sepanjang hari — bantu atur jadwal shift &amp; stok
            </p>
            <HourlyBarChart data={hourly} />
          </div>

          {/* Perbandingan antar outlet — hanya bila ≥2 cabang dalam cakupan */}
          {outletSales.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900">Perbandingan Outlet</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Omzet
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Profit
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Omzet &amp; profit tiap cabang berdampingan
              </p>
              <OutletComparisonChart data={outletSales} />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-1">Penjualan per Kategori</p>
            <p className="text-xs text-gray-400 mb-4">
              Kontribusi tiap kategori produk terhadap omzet
            </p>
            <div className="max-w-md">
              <CategoryBreakdown data={categories} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Produk Terlaris */}
      {tab === 'products' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Produk Terlaris</p>
            <select
              value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700"
            >
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Produk</th>
                  <th className="px-5 py-3 font-medium text-right">Terjual</th>
                  <th className="px-5 py-3 font-medium text-right">Revenue</th>
                  <th className="px-5 py-3 font-medium text-right">HPP</th>
                  <th className="px-5 py-3 font-medium text-right">Profit</th>
                  <th className="px-5 py-3 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      Belum ada penjualan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, i) => (
                    <tr key={p.productId} className="border-b border-gray-50">
                      <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                        {p.quantitySold}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {IDR.format(p.revenue)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                        {IDR.format(p.hpp)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-emerald-600">
                        {IDR.format(p.revenue - p.hpp)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            p.margin >= 50
                              ? 'bg-emerald-100 text-emerald-700'
                              : p.margin >= 30
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.margin}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rekap Shift */}
      {tab === 'shifts' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">Dibuka</th>
                  <th className="px-5 py-3 font-medium">Ditutup</th>
                  <th className="px-5 py-3 font-medium">Outlet</th>
                  <th className="px-5 py-3 font-medium">Kasir</th>
                  <th className="px-5 py-3 font-medium text-right">Transaksi</th>
                  <th className="px-5 py-3 font-medium text-right">Penjualan</th>
                  <th className="px-5 py-3 font-medium text-right">Selisih Kas</th>
                </tr>
              </thead>
              <tbody>
                {(shiftData?.items.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      Belum ada shift pada periode ini.
                    </td>
                  </tr>
                ) : (
                  shiftData!.items.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="px-5 py-3 text-gray-700">{dateTime(s.openedAt)}</td>
                      <td className="px-5 py-3 text-gray-500">{dateTime(s.closedAt)}</td>
                      <td className="px-5 py-3 text-gray-700">{s.outletName}</td>
                      <td className="px-5 py-3 text-gray-700">{s.cashierName}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                        {s.salesCount}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {IDR.format(s.salesTotal)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums font-medium ${
                          s.cashDifference < 0
                            ? 'text-red-600'
                            : s.cashDifference > 0
                              ? 'text-emerald-600'
                              : 'text-gray-400'
                        }`}
                      >
                        {s.cashDifference === 0 ? '—' : IDR.format(s.cashDifference)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {shiftData && shiftData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
              <span>Total {shiftData.meta.total} shift</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={shiftPage <= 1}
                  onClick={() => setShiftPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="tabular-nums">
                  Hal {shiftData.meta.page} / {shiftData.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={shiftPage >= shiftData.meta.totalPages}
                  onClick={() => setShiftPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RequirePermission
      anyOf={['report.view']}
      message="Hanya Owner/Super Admin yang dapat melihat laporan penjualan."
    >
      <ReportsPageInner />
    </RequirePermission>
  );
}
