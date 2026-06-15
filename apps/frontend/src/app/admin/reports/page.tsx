import {
  ShieldAlert,
  Wallet,
  TrendingUp,
  Building2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { verifySession } from '@/lib/session';
import {
  fetchPlatformReportSummary,
  fetchPlatformRevenueTrend,
  fetchPlatformPlanDistribution,
  fetchPlatformRecentSubscriptions,
} from '@/features/admin/server';
import type { ReportPeriod } from '@/features/admin/types';
import { IDR } from '@/lib/format';
import { AdminConsoleHeader } from '../_components/AdminConsoleHeader';
import { ReportControls } from './ReportControls';
import { RevenueTrendChart, PlanDistributionChart } from './ReportCharts';

/** Badge tren persentase (hijau bila ≥0, merah bila <0). null → tak tampil. */
function TrendBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
      }`}
    >
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconColor,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  iconColor: string;
  trend?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && <TrendBadge pct={trend} />}
      </div>
      <p className="text-sm text-gray-500 mt-3">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
  );
}

const VALID_PERIOD: ReportPeriod[] = ['30d', '90d', 'ytd', 'custom'];

interface SearchParams {
  period?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Laporan Platform (Super Admin) — Server Component. Ringkasan pendapatan SaaS
 * + tren bulanan + distribusi paket, difilter periode via URL searchParams.
 * Interaktivitas (ganti periode, ekspor Excel) di Client Components.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const adminName = session.user.name ?? 'Super Admin';

  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminConsoleHeader
          title="Laporan Platform"
          adminName={adminName}
          backHref="/admin"
          loginAt={session.loginAt}
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hanya Super Admin yang dapat melihat laporan platform.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const period: ReportPeriod = VALID_PERIOD.includes(sp.period as ReportPeriod)
    ? (sp.period as ReportPeriod)
    : '30d';
  const startDate = sp.startDate ?? '';
  const endDate = sp.endDate ?? '';

  const query = { period, startDate: startDate || undefined, endDate: endDate || undefined };

  const [summary, trend, distribution, recent] = await Promise.all([
    fetchPlatformReportSummary(query),
    fetchPlatformRevenueTrend(query),
    fetchPlatformPlanDistribution(),
    fetchPlatformRecentSubscriptions(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminConsoleHeader
        title="Laporan Platform"
        adminName={adminName}
        backHref="/admin"
        loginAt={session.loginAt}
      />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <ReportControls period={period} startDate={startDate} endDate={endDate} />

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Wallet}
            label="MRR (estimasi)"
            value={IDR.format(summary.mrr)}
            subtext={`${summary.activeTenants} tenant aktif`}
            iconColor="bg-emerald-50 text-emerald-600"
            trend={summary.revenueGrowthPct}
          />
          <StatCard
            icon={TrendingUp}
            label="Pendapatan Lunas"
            value={IDR.format(summary.paidRevenue)}
            subtext="Pada periode terpilih"
            iconColor="bg-amber-50 text-amber-600"
            trend={summary.revenueGrowthPct}
          />
          <StatCard
            icon={AlertCircle}
            label="Belum Dibayar"
            value={IDR.format(summary.unpaidRevenue)}
            subtext="Tagihan tertunggak"
            iconColor="bg-red-50 text-red-500"
          />
          <StatCard
            icon={Building2}
            label="Tenant Baru"
            value={String(summary.newTenants)}
            subtext={`Total ${summary.totalTenants} tenant`}
            iconColor="bg-blue-50 text-blue-600"
          />
        </div>

        {/* Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Tren Pendapatan &amp; Tenant Baru (per bulan)
            </p>
            <RevenueTrendChart data={trend} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">Distribusi Paket</p>
            <PlanDistributionChart data={distribution} />
          </div>
        </div>

        {/* Status tenant ringkas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Aktif"
            value={String(summary.activeTenants)}
            subtext="Berlangganan"
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={Building2}
            label="Trial"
            value={String(summary.trialTenants)}
            subtext="Masa percobaan"
            iconColor="bg-orange-50 text-orange-500"
          />
          <StatCard
            icon={Building2}
            label="Suspended"
            value={String(summary.suspendedTenants)}
            subtext="Ditangguhkan"
            iconColor="bg-red-50 text-red-500"
          />
          <StatCard
            icon={Building2}
            label="Churn"
            value={String(summary.churnedTenants)}
            subtext="Berhenti (cancelled)"
            iconColor="bg-gray-100 text-gray-500"
          />
        </div>

        {/* Aktivitas Terkini — langganan/invoice terbaru lintas-tenant */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <p className="text-sm font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">
            Aktivitas Terkini
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">ID Transaksi</th>
                  <th className="px-5 py-3 font-medium">Tenant</th>
                  <th className="px-5 py-3 font-medium">Paket</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      Belum ada aktivitas langganan.
                    </td>
                  </tr>
                ) : (
                  recent.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="px-5 py-3 font-mono text-xs text-gray-400">
                        {s.invoiceRef ?? '—'}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{s.tenantName}</td>
                      <td className="px-5 py-3 text-gray-600">{s.planName}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            s.isPaid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {s.isPaid ? 'Lunas' : 'Belum bayar'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {IDR.format(s.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-2 pb-6 text-center">
          <p className="text-sm text-gray-400">
            © 2026 Kasirku SaaS Platform. Hak Cipta Dilindungi.
          </p>
          <div className="mt-1 flex items-center justify-center gap-4 text-sm text-emerald-600">
            <span className="cursor-default">Ketentuan Layanan</span>
            <span className="cursor-default">Kebijakan Privasi</span>
            <span className="cursor-default">Pusat Bantuan</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
