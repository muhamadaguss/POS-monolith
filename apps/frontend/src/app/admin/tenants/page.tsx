import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  Wallet,
} from 'lucide-react';
import { verifySession } from '@/lib/session';
import { fetchPlatformStats, fetchTenants } from '@/features/admin/server';
import { IDR } from '@/lib/format';
import { TenantsView } from './TenantsView';

/** Header admin (selaras gaya halaman admin lain) dengan tombol kembali ke /admin. */
function AdminHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
      <Link
        href="/admin"
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Kembali"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600">
        <span className="text-white font-bold text-sm">K</span>
      </div>
      <div>
        <span className="font-bold text-gray-900">Manajemen Tenant</span>
        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          Super Admin
        </span>
      </div>
    </header>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;
const VALID_STATUS = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'];
const VALID_PLAN = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

interface SearchParams {
  search?: string;
  status?: string;
  plan?: string;
  page?: string;
}

/**
 * Manajemen Tenant lintas-tenant — Server Component (khusus Super Admin).
 * KPI + daftar di-fetch di server (serverFetch) sesuai searchParams; interaktivitas
 * (filter/pagination/navigasi baris) di TenantsView (Client Component).
 */
export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();

  // RBAC: hanya Super Admin (selaras backend @Roles(SUPER_ADMIN) & proxy).
  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hanya Super Admin yang dapat mengelola tenant platform.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const search = sp.search?.trim() ?? '';
  const status = VALID_STATUS.includes(sp.status ?? '') ? sp.status! : '';
  const plan = VALID_PLAN.includes(sp.plan ?? '') ? sp.plan! : '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const [stats, data] = await Promise.all([
    fetchPlatformStats(),
    fetchTenants({
      search: search || undefined,
      status: (status || undefined) as never,
      plan: (plan || undefined) as never,
      page,
      limit: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Building2}
            label="Total Tenant"
            value={String(stats.total)}
            color="bg-gray-100 text-gray-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Aktif"
            value={String(stats.active)}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={Clock}
            label="Masa Coba"
            value={String(stats.trial)}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={Ban}
            label="Ditangguhkan"
            value={String(stats.suspended)}
            color="bg-red-100 text-red-600"
          />
          <StatCard
            icon={Wallet}
            label="Estimasi MRR"
            value={IDR.format(stats.mrr)}
            color="bg-violet-100 text-violet-600"
          />
        </div>

        <TenantsView data={data} search={search} status={status} plan={plan} page={page} />
      </main>
    </div>
  );
}
