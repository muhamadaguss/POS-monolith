import {
  ShieldAlert,
  Wallet,
  TrendingUp,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { verifySession } from '@/lib/session';
import {
  fetchPlatformReportSummary,
  fetchPlatformRevenueTrend,
  fetchPlatformPlanDistribution,
} from '@/features/admin/server';
import type { ReportPeriod } from '@/features/admin/types';
import { IDR } from '@/lib/format';
import { AdminConsoleHeader } from '../_components/AdminConsoleHeader';
import { ReportControls } from './ReportControls';
import { RevenueTrendChart, PlanDistributionChart } from './ReportCharts';

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
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

  const [summary, trend, distribution] = await Promise.all([
    fetchPlatformReportSummary(query),
    fetchPlatformRevenueTrend(query),
    fetchPlatformPlanDistribution(),
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
          />
          <StatCard
            icon={TrendingUp}
            label="Pendapatan Lunas"
            value={IDR.format(summary.paidRevenue)}
            subtext="Pada periode terpilih"
            iconColor="bg-amber-50 text-amber-600"
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
      </main>
    </div>
  );
}
