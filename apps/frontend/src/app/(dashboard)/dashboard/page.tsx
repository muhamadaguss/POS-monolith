import Link from 'next/link';
import {
  TrendingUp,
  ShoppingCart,
  Tag,
  BarChart2,
  Clock,
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
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Selamat datang, {user.name}</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ringkasan performa penjualan outlet</p>
        </div>
        <DashboardControls
          isOwner={isOwner}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          period={period}
        />
      </div>
      {isOwner && (
        <p className="text-xs text-gray-400 -mt-4">
          Menampilkan data:{' '}
          <span className="font-semibold text-gray-600">{selectedOutletName}</span>
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Tren Penjualan</p>
              <p className="text-xs text-gray-400 mt-0.5">{TREND_SUBTITLE[period]}</p>
            </div>
            <p className="text-xs text-gray-400">Total {IDR.format(summary.totalRevenue)}</p>
          </div>
          <SalesTrendChart data={summary.dailyBreakdown} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Metode Pembayaran</p>
          <PaymentBreakdown data={summary.paymentBreakdown} />
        </div>
      </div>

      {/* Jam ramai + kontribusi kategori (ringkas; versi penuh di /reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">Jam Ramai</p>
            <Link
              href="/reports"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Lihat Analitik
            </Link>
          </div>
          <HourlyBarChart data={hourly} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Penjualan per Kategori</p>
          <CategoryBreakdown data={categories} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-900">Produk Terlaris</p>
          <Link
            href="/reports"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Lihat Semua
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-3 text-xs font-semibold text-gray-400 pr-4">#</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 pr-4">Produk</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 text-right pr-4">Terjual</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 text-right pr-4">Revenue</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400">
                    Belum ada penjualan pada periode ini.
                  </td>
                </tr>
              ) : (
                topProducts.map((p, i) => (
                  <tr key={p.productId}>
                    <td className="py-3 pr-4 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <ProductCell name={p.productName} imageUrl={p.imageUrl} />
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-600 tabular-nums">
                      {p.quantitySold}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-gray-900 tabular-nums">
                      {IDR.format(p.revenue)}
                    </td>
                    <td className="py-3 text-right">
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Shift Sedang Berjalan</p>
              <p className="text-xs text-emerald-600 mt-0.5">
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
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            Kelola <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Belum Ada Shift Aktif</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Buka shift untuk mulai menerima transaksi
              </p>
            </div>
          </div>
          <Link
            href="/shift"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
          >
            Buka Shift <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Statistik hari ini */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Transaksi Anda Hari Ini
        </p>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            icon={ShoppingCart}
            label="Total Transaksi"
            value={stats.totalTransactions.toString()}
            sub="transaksi selesai"
            color="bg-blue-100 text-blue-600"
          />
          <KpiCard
            icon={TrendingUp}
            label="Total Omset"
            value={IDR.format(stats.totalRevenue)}
            sub="outlet hari ini"
            color="bg-emerald-100 text-emerald-600"
          />
        </div>
      </div>

      {/* Shortcut ke POS */}
      <Link
        href="/pos"
        className="flex items-center justify-center gap-2 w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
      >
        Mulai Kasir (POS)
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
