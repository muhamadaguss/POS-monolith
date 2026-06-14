import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { verifySession, serverFetch } from '@/lib/session';
import type { AdminUserListResponse } from '@/features/admin/types';
import { AdminUsersView } from './AdminUsersView';

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
        <span className="font-bold text-gray-900">Manajemen User</span>
        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          Super Admin
        </span>
      </div>
    </header>
  );
}

const PAGE_SIZE = 20;
const VALID_ROLES = ['SUPER_ADMIN', 'TENANT_OWNER', 'STORE_MANAGER', 'CASHIER'];
const VALID_STATUS = ['ACTIVE', 'INACTIVE', 'LOCKED'];

interface SearchParams {
  search?: string;
  role?: string;
  status?: string;
  page?: string;
}

/**
 * Manajemen User lintas-tenant — Server Component (khusus Super Admin).
 * Data di-fetch di server (serverFetch) sesuai searchParams; interaktivitas
 * (filter/pagination/dialog mutasi) di AdminUsersView (Client Component).
 */
export default async function AdminUsersPage({
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

  const data = await serverFetch<AdminUserListResponse>(`/admin/users?${params}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AdminUsersView
          data={data}
          selfId={session.user.id}
          search={search}
          role={role}
          status={status}
          page={page}
        />
      </main>
    </div>
  );
}
