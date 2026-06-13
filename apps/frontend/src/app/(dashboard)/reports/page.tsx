import Link from 'next/link';
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { verifySession } from '@/lib/session';
import { IDR } from '@/lib/format';
import {
  getSalesSummaryWithGrowth,
  getTopProducts,
  getShiftSummary,
  getHourlySales,
  getSalesByCategory,
  getSalesByOutlet,
} from '@/features/reports/server';
import type {
  SalesSummaryWithGrowth,
  TopProduct,
  ShiftReportResult,
  HourlySalesPoint,
  CategorySalesItem,
  OutletSalesItem,
  ReportPeriod,
  DateRange,
} from '@/features/reports/shared';
import {
  SalesTrendChart,
  PaymentBreakdown,
  HourlyBarChart,
  CategoryBreakdown,
  OutletComparisonChart,
} from '@/features/reports/components/charts';
import { ReportsControls } from './ReportsControls';
import { ReportsTabNav, type ReportTab } from './ReportsTabNav';
import { CompareToggle, TopLimitSelect } from './ReportsParamControls';

const SHIFT_PAGE_SIZE = 20;
const VALID_TABS: ReportTab[] = ['sales', 'analytics', 'products', 'shifts'];
const VALID_LIMITS = [10, 25, 50];

interface SearchParams {
  outlet?: string;
  period?: string;
  from?: string;
  to?: string;
  tab?: string;
  limit?: string;
  page?: string;
  compare?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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

/** Bangun href halaman ini dgn satu param diubah (untuk Link pagination). */
function buildHref(current: SearchParams, patch: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, String(v));
  }
  const qs = params.toString();
  return `/reports${qs ? `?${qs}` : ''}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  // Next.js 16: searchParams adalah Promise.
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const user = session.user;

  // RBAC: hanya yang punya report.view (Owner/Super Admin). Inline "Akses Ditolak"
  // konsisten dgn pola lama (RequirePermission); backend tetap sumber kebenaran.
  if (!user.permissions?.includes('report.view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hanya Owner/Super Admin yang dapat melihat laporan penjualan.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const isOwner = user.role === 'TENANT_OWNER';

  // Outlet efektif: Owner boleh memilih ('' = semua); lainnya terkunci ke outletnya.
  const pickedOutletId = isOwner ? (sp.outlet ?? '') : (user.currentOutletId ?? '');
  const outletParam = pickedOutletId || undefined;

  const preset = (['TODAY', 'WEEK', 'MONTH', 'CUSTOM'].includes(sp.period ?? '')
    ? sp.period
    : 'MONTH') as ReportPeriod;
  const customStart = sp.from ?? todayStr();
  const customEnd = sp.to ?? todayStr();
  const range: ReportPeriod | DateRange =
    preset === 'CUSTOM' ? { startDate: customStart, endDate: customEnd } : preset;

  const tab: ReportTab = (VALID_TABS.includes(sp.tab as ReportTab) ? sp.tab : 'sales') as ReportTab;
  const topLimit = VALID_LIMITS.includes(Number(sp.limit)) ? Number(sp.limit) : 10;
  const shiftPage = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const compare = sp.compare === '1';

  // KPI butuh ringkasan + produk (untuk estimasi profit) → selalu di-fetch.
  // Data tab lain di-fetch sesuai tab aktif agar kerja server minimal.
  const summaryP = getSalesSummaryWithGrowth(range, outletParam);
  const profitProductsP = getTopProducts(range, outletParam, 50);

  let summary: SalesSummaryWithGrowth;
  let profitProducts: TopProduct[];
  let topProducts: TopProduct[] = [];
  let shiftData: ShiftReportResult | null = null;
  let hourly: HourlySalesPoint[] = [];
  let categories: CategorySalesItem[] = [];
  let outletSales: OutletSalesItem[] = [];

  if (tab === 'products') {
    [summary, profitProducts, topProducts] = await Promise.all([
      summaryP,
      profitProductsP,
      getTopProducts(range, outletParam, topLimit),
    ]);
  } else if (tab === 'shifts') {
    [summary, profitProducts, shiftData] = await Promise.all([
      summaryP,
      profitProductsP,
      getShiftSummary(range, outletParam, shiftPage, SHIFT_PAGE_SIZE),
    ]);
  } else if (tab === 'analytics') {
    [summary, profitProducts, hourly, categories, outletSales] = await Promise.all([
      summaryP,
      profitProductsP,
      getHourlySales(range, outletParam),
      getSalesByCategory(range, outletParam),
      getSalesByOutlet(range, outletParam),
    ]);
  } else {
    [summary, profitProducts] = await Promise.all([summaryP, profitProductsP]);
  }

  // Estimasi profit & margin dari produk (50 teratas mencakup mayoritas omzet).
  const profit = profitProducts.reduce((sum, p) => sum + (p.revenue - p.hpp), 0);
  const marginPct =
    summary.totalRevenue > 0 ? Math.round((profit / summary.totalRevenue) * 100) : null;

  const totalWithVoid = summary.totalTransactions + summary.voidedCount;
  const voidPct = totalWithVoid === 0 ? 0 : Math.round((summary.voidedCount / totalWithVoid) * 100);
  const netRevenue = summary.totalRevenue - summary.totalDiscount;

  // Label periode untuk header chart.
  const trendLabel = (() => {
    if (preset === 'CUSTOM') {
      const fmt = (d: string) =>
        new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return `${fmt(customStart)} – ${fmt(customEnd)}`;
    }
    const days = summary.dailyBreakdown;
    const anchor = days.length ? new Date(days[days.length - 1].date) : new Date();
    return anchor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="space-y-5">
      {/* Header + kontrol */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analisis penjualan, produk, &amp; shift.</p>
        </div>
        <ReportsControls
          isOwner={isOwner}
          outlets={session.outlets.map((o) => ({ id: o.id, name: o.name }))}
          pickedOutletId={pickedOutletId}
          preset={preset}
          customStart={sp.from ?? ''}
          customEnd={sp.to ?? ''}
          range={range}
          outletParam={outletParam}
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Total Omset"
          value={IDR.format(summary.totalRevenue)}
          sub={`${summary.totalTransactions} transaksi`}
          color="bg-emerald-100 text-emerald-600"
          badge={<GrowthBadge growth={summary.revenueGrowth} />}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Total Transaksi"
          value={String(summary.totalTransactions)}
          sub={`${summary.voidedCount} Void (${voidPct}%)`}
          color="bg-blue-100 text-blue-600"
        />
        <KpiCard
          icon={Receipt}
          label="Rata-rata / Transaksi"
          value={IDR.format(
            summary.totalTransactions > 0
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
      </div>

      {/* Tabs (Client: ubah ?tab=) */}
      <ReportsTabNav active={tab} />

      {/* Tab: Penjualan */}
      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-900">
                  Tren Penjualan <span className="font-normal text-gray-400">({trendLabel})</span>
                </p>
                <CompareToggle checked={compare} />
              </div>
              {compare && summary.previousRevenue !== null && (
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded bg-emerald-500" /> Periode ini
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded bg-gray-300" /> Periode sebelumnya
                  </span>
                  <span className="ml-auto">
                    Sebelumnya:{' '}
                    <span className="font-semibold text-gray-700">
                      {IDR.format(summary.previousRevenue)}
                    </span>
                  </span>
                </div>
              )}
              <SalesTrendChart
                data={summary.dailyBreakdown}
                previousData={compare ? summary.dailyBreakdownPrevious : undefined}
              />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Metode Pembayaran</p>
              <PaymentBreakdown data={summary.paymentBreakdown} />
            </div>
          </div>

          {/* Ringkasan keuangan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-gray-400">Total Penjualan Kotor</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">
                    {IDR.format(summary.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Diskon</p>
                  <p className="text-base font-bold text-red-600 tabular-nums">
                    {summary.totalDiscount > 0 ? '- ' : ''}
                    {IDR.format(summary.totalDiscount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Pajak (PB1)</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">
                    {IDR.format(summary.totalTax)}
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

      {/* Tab: Analitik (per jam + per kategori + perbandingan outlet) */}
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
            <TopLimitSelect value={topLimit} />
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
      {tab === 'shifts' && shiftData && (
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
                {shiftData.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      Belum ada shift pada periode ini.
                    </td>
                  </tr>
                ) : (
                  shiftData.items.map((s) => (
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

          {shiftData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
              <span>Total {shiftData.meta.total} shift</span>
              <div className="flex items-center gap-2">
                <PageLink
                  disabled={shiftPage <= 1}
                  href={buildHref(sp, { page: String(shiftPage - 1) })}
                />
                <span className="tabular-nums">
                  Hal {shiftData.meta.page} / {shiftData.meta.totalPages}
                </span>
                <PageLink
                  disabled={shiftPage >= shiftData.meta.totalPages}
                  href={buildHref(sp, { page: String(shiftPage + 1) })}
                  next
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Tombol pagination prev/next sebagai Link (disabled → span). */
function PageLink({ disabled, href, next }: { disabled: boolean; href: string; next?: boolean }) {
  const Icon = next ? ChevronRight : ChevronLeft;
  const base =
    'inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors';
  if (disabled) {
    return (
      <span className={`${base} border-gray-200 text-gray-300 cursor-not-allowed`} aria-disabled>
        <Icon className="size-4" />
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} border-gray-200 text-gray-700 hover:bg-gray-50`}>
      <Icon className="size-4" />
    </Link>
  );
}
