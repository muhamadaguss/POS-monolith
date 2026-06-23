import Link from 'next/link';
import {
  TrendingUp,
  ShoppingCart,
  Tag,
  BarChart2,
  Clock,
  Package,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { verifySession } from '@/lib/session';
import {
  getManagerDashboard,
  getCashierDashboard,
  type ManagerDashboardData,
  type CashierDashboardData,
} from '@/features/dashboard/server';
import {
  SalesTrendChart,
  PaymentBreakdown,
  HourlyBarChart,
  CategoryBreakdown,
} from '@/features/reports/components/charts';
import type { ReportPeriod } from '@/features/reports/shared';
import { IDR, formatShiftDuration } from '@/lib/format';
import { DashboardControls } from './DashboardControls';
import { ProductCell } from './ProductCell';

interface SearchParams {
  period?: string;
  outlet?: string;
}

/** Subjudul panel Tren Penjualan mengikuti periode aktif. */
const TREND_SUBTITLE: Record<ReportPeriod, string> = {
  TODAY: 'Performa hari ini',
  WEEK: 'Performa 7 hari terakhir',
  MONTH: 'Performa 30 hari terakhir',
  CUSTOM: 'Performa periode terpilih',
};

/**
 * Sub-label tarif pajak untuk kartu Pajak Terkumpul (totalTax / totalSubtotal).
 * - 1 cabang dipilih: tarif dibulatkan, mis. "PPN 10%".
 * - Semua Cabang: tarif gabungan bisa pecahan → "PPN efektif 10,4%".
 */
function taxRateLabel(
  totalTax: number,
  totalSubtotal: number,
  singleOutlet: boolean,
): string | undefined {
  if (totalSubtotal <= 0) return undefined;
  const pct = (totalTax / totalSubtotal) * 100;
  if (singleOutlet) return `PPN ${Math.round(pct)}%`;
  return `PPN efektif ${pct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

/** Badge pertumbuhan (mis. +12% / −8%). Disembunyikan bila growth null. */
function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth === null) return null;
  const up = growth >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm ${
        up ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'
      }`}
    >
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}
      {growth.toFixed(0)}%
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
    <div className="relative bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-4">{label}</p>
      <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  // Next.js 16: searchParams adalah Promise.
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const user = session.user;
  const canViewReports = user.permissions?.includes('report.view') ?? false;

  if (canViewReports) {
    const sp = await searchParams;
    const isOwner = user.role === 'TENANT_OWNER';
    const period = (['TODAY', 'WEEK', 'MONTH'].includes(sp.period ?? '')
      ? sp.period
      : 'WEEK') as ReportPeriod;
    // Owner boleh memilih cabang ('' = semua); Manager terkunci ke outletnya.
    const selectedOutletId = isOwner ? (sp.outlet ?? '') : (user.currentOutletId ?? '');
    const outletParam = selectedOutletId || undefined;
    const outlets = session.outlets.map((o) => ({ id: o.id, name: o.name }));

    const data = await getManagerDashboard(period, outletParam);

    return (
      <div className="space-y-6">
        <ManagerDashboard
          isOwner={isOwner}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          period={period}
          data={data}
        />
      </div>
    );
  }

  // Kasir: shift aktif + statistik hari ini.
  const outletId = user.currentOutletId ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-4">Selamat datang, {user.name}</p>
      </div>
      {outletId ? (
        <CashierDashboard data={await getCashierDashboard(outletId)} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm text-amber-700">
            Outlet belum dipilih. Hubungi manajer untuk menetapkan outlet Anda.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Manager / Owner ───────────────────────────────────────────────

function ManagerDashboard({
  isOwner,
  outlets,
  selectedOutletId,
  period,
  data,
}: {
  isOwner: boolean;
  outlets: { id: string; name: string }[];
  selectedOutletId: string;
  period: ReportPeriod;
  data: ManagerDashboardData;
}) {
  const { summary, topProducts, hourly, categories } = data;
  const selectedOutletName = selectedOutletId
    ? (outlets.find((o) => o.id === selectedOutletId)?.name ?? 'Cabang')
    : 'Semua Cabang';

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-4">Ringkasan performa penjualan outlet</p>
        </div>
        <DashboardControls
          isOwner={isOwner}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          period={period}
        />
      </div>
      {isOwner && (
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-4">
          Menampilkan data:{' '}
          <span className="font-semibold text-gray-600 dark:text-gray-300">{selectedOutletName}</span>
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Total Omzet"
          value={IDR.format(summary.totalRevenue)}
          sub={`${summary.totalTransactions} transaksi`}
          color="bg-emerald-100 text-emerald-600"
          badge={<GrowthBadge growth={summary.revenueGrowth} />}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Total Transaksi"
          value={summary.totalTransactions.toString()}
          sub={`${summary.voidedCount} void`}
          color="bg-blue-100 text-blue-600"
        />
        <KpiCard
          icon={Tag}
          label="Total Diskon"
          value={IDR.format(summary.totalDiscount)}
          sub={summary.totalDiscount > 0 ? undefined : 'Tanpa promo'}
          color="bg-amber-100 text-amber-600"
        />
        <KpiCard
          icon={BarChart2}
          label="Pajak Terkumpul"
          value={IDR.format(summary.totalTax)}
          sub={taxRateLabel(summary.totalTax, summary.totalSubtotal, !!selectedOutletId)}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative lg:col-span-2 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-5 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 to-emerald-500/20" />
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tren Penjualan</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{TREND_SUBTITLE[period]}</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Total {IDR.format(summary.totalRevenue)}</p>
          </div>
          <SalesTrendChart data={summary.dailyBreakdown} />
        </div>
        <div className="relative bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-5 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400/60 to-blue-500/20" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Metode Pembayaran</p>
          <PaymentBreakdown data={summary.paymentBreakdown} />
        </div>
      </div>

      {/* Jam ramai + kontribusi kategori (ringkas; versi penuh di /reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative lg:col-span-2 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-5 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400/60 to-violet-500/20" />
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Jam Ramai</p>
            <Link
              href="/reports"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 hover:gap-2 transition-all"
            >
              Lihat Analitik
            </Link>
          </div>
          <HourlyBarChart data={hourly} />
        </div>
        <div className="relative bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-5 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400/60 to-orange-500/20" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Penjualan per Kategori</p>
          <CategoryBreakdown data={categories} />
        </div>
      </div>

      <div className="relative bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-5 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 to-emerald-500/20" />
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Produk Terlaris</p>
          <Link
            href="/reports"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 hover:gap-2 transition-all"
          >
            Lihat Semua
          </Link>
        </div>
        <div className="relative">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 dark:text-gray-500">#</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 dark:text-gray-500">Produk</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 dark:text-gray-500 text-right">Terjual</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 dark:text-gray-500 text-right hidden sm:table-cell">Revenue</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 dark:text-gray-500 text-right hidden lg:table-cell">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50 dark:divide-gray-700/30">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <Package className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada penjualan pada periode ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, i) => (
                    <tr key={p.productId} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 transition-colors duration-150">
                      <td className="py-3 pr-4 text-gray-400 dark:text-gray-500 font-medium">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <ProductCell name={p.productName} imageUrl={p.imageUrl} />
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600 dark:text-gray-400 tabular-nums">
                        {p.quantitySold}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-gray-900 dark:text-gray-100 tabular-nums hidden sm:table-cell">
                        {IDR.format(p.revenue)}
                      </td>
                      <td className="py-3 text-right hidden lg:table-cell">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${
                            p.margin >= 50
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                              : p.margin >= 30
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
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
          {/* Scroll shadow cue */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white dark:from-gray-800/90 to-transparent" />
        </div>
      </div>
    </>
  );
}

// ── Dashboard Kasir ─────────────────────────────────────────────────────────

function CashierDashboard({ data }: { data: CashierDashboardData }) {
  const { shift, stats } = data;
  return (
    <div className="space-y-4">
      {/* Status shift */}
      {shift ? (
        <div className="relative bg-white dark:bg-gray-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-300">Shift Sedang Berjalan</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Dibuka{' '}
                {new Date(shift.openedAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}
                {formatShiftDuration(shift.openedAt)} yang lalu
                {' · '}Kas awal {IDR.format(Number(shift.openingCash))}
              </p>
            </div>
          </div>
          <Link
            href="/shift"
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-1 hover:gap-2 transition-all shrink-0"
          >
            Kelola <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="relative bg-white dark:bg-gray-800/90 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-300">Belum Ada Shift Aktif</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Buka shift untuk mulai menerima transaksi
              </p>
            </div>
          </div>
          <Link
            href="/shift"
            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 flex items-center gap-1 hover:gap-2 transition-all shrink-0"
          >
            Buka Shift <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Statistik hari ini */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          Transaksi Anda Hari Ini
        </p>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            icon={ShoppingCart}
            label="Total Transaksi"
            value={stats.totalTransactions.toString()}
            sub="transaksi selesai"
            color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            icon={TrendingUp}
            label="Total Omset"
            value={IDR.format(stats.totalRevenue)}
            sub="outlet hari ini"
            color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </div>

      {/* Shortcut ke POS */}
      <Link
        href="/pos"
        className="flex items-center justify-center gap-2 w-full h-14 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
      >
        Mulai Kasir (POS)
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
