import {
  ShieldAlert,
  Users,
  UserCheck,
  UserCog,
  Calculator,
} from 'lucide-react';
import { verifySession, serverFetch } from '@/lib/session';
import { fetchUserStats, fetchTenants } from '@/features/admin/server';
import type {
  AdminUserListResponse,
  TenantOption,
} from '@/features/admin/types';
import { AdminUsersView } from './AdminUsersView';
import { AdminConsoleHeader } from '../_components/AdminConsoleHeader';

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;
const VALID_ROLES = ['SUPER_ADMIN', 'TENANT_OWNER', 'STORE_MANAGER', 'CASHIER'];
const VALID_STATUS = ['ACTIVE', 'INACTIVE', 'LOCKED'];
const NUM = new Intl.NumberFormat('id-ID');

interface SearchParams {
  search?: string;
  role?: string;
  status?: string;
  page?: string;
}

/**
 * Manajemen User lintas-tenant — Server Component (khusus Super Admin).
 * KPI + daftar di-fetch di server; interaktivitas (filter/pagination/dialog
 * mutasi & Tambah User) di AdminUsersView (Client Component).
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const adminName = session.user.name ?? 'Super Admin';

  // RBAC: hanya Super Admin (selaras backend @Roles(SUPER_ADMIN) & proxy).
  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminConsoleHeader
          title="Manajemen User"
          adminName={adminName}
          backHref="/admin"
          loginAt={session.loginAt}
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hanya Super Admin yang dapat mengelola user platform.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const search = sp.search?.trim() ?? '';
  const role = VALID_ROLES.includes(sp.role ?? '') ? sp.role! : '';
  const status = VALID_STATUS.includes(sp.status ?? '') ? sp.status! : '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (status) params.set('status', status);

  const [data, stats, tenantList] = await Promise.all([
    serverFetch<AdminUserListResponse>(`/admin/users?${params}`),
    fetchUserStats(),
    fetchTenants({ page: 1, limit: 100 }),
  ]);

  const tenantOptions: TenantOption[] = tenantList.items.map((t) => ({
    id: t.id,
    name: t.name,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminConsoleHeader
          title="Manajemen User"
          adminName={adminName}
          backHref="/admin"
          loginAt={session.loginAt}
        />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Pengguna"
            value={NUM.format(stats.total)}
            iconColor="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            icon={UserCheck}
            label="Pengguna Aktif"
            value={NUM.format(stats.active)}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={UserCog}
            label="Peran Manajer"
            value={NUM.format(stats.managers)}
            iconColor="bg-gray-100 text-gray-600"
          />
          <StatCard
            icon={Calculator}
            label="Peran Kasir"
            value={NUM.format(stats.cashiers)}
            iconColor="bg-violet-50 text-violet-600"
          />
        </div>

        <AdminUsersView
          data={data}
          selfId={session.user.id}
          tenantOptions={tenantOptions}
          search={search}
          role={role}
          status={status}
          page={page}
        />
      </main>
    </div>
  );
}
