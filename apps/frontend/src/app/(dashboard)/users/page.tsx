import { ShieldAlert } from 'lucide-react';
import { verifySession, serverFetch } from '@/lib/session';
import type { StaffMember } from '@/features/users/api';
import { UsersView } from './UsersView';

/**
 * Karyawan (staff) — Server Component.
 *
 * Daftar staf di-fetch di server via DAL (serverFetch). Interaktivitas
 * (search/filter/pagination in-memory + dialog create/edit/assign/deactivate)
 * di UsersView (Client Component). Setelah mutasi, UsersView memanggil
 * router.refresh() agar Server Component memuat ulang data.
 */
export default async function UsersPage() {
  const session = await verifySession();
  const perms = session.user.permissions ?? [];

  // RBAC: butuh salah satu izin staf (selaras gating sidebar & backend).
  const canView =
    perms.includes('staff.view_local') ||
    perms.includes('staff.manage_local') ||
    perms.includes('staff.manage_global');

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-1">
          Anda tidak memiliki izin untuk mengelola karyawan.
        </p>
      </div>
    );
  }

  const staff = await serverFetch<StaffMember[]>('/users');

  return (
    <UsersView
      staff={staff}
      canManageGlobal={perms.includes('staff.manage_global')}
      canManageLocal={perms.includes('staff.manage_local')}
      outlets={session.outlets}
    />
  );
}
