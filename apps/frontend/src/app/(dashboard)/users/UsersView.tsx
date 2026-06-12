'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Pencil,
  UserX,
  UserCheck,
  RefreshCw,
  ShieldCheck,
  Users,
  Store,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StaffMember } from '@/features/users/api';
import { getInitials, formatDate } from '@/lib/format';
import {
  RoleBadge,
  StatusDot,
  CreateDialog,
  EditDialog,
  AssignRoleDialog,
  DeactivateDialog,
} from '@/features/users/components';

const AVATAR_CLASS: Record<string, string> = {
  TENANT_OWNER: 'bg-purple-200 text-purple-800',
  STORE_MANAGER: 'bg-emerald-200 text-emerald-800',
  CASHIER: 'bg-blue-100 text-blue-700',
};

const ROLE_FILTERS = ['Semua', 'Kasir', 'Manajer'] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const PAGE_SIZE = 10;

interface OutletOpt {
  id: string;
  name: string;
}

/**
 * Tampilan + interaksi halaman Karyawan. Data `staff` datang dari Server
 * Component (page.tsx). Search/filter/pagination dihitung di klien (data set kecil,
 * tanpa pagination server). Setelah mutasi dialog, panggil router.refresh() →
 * Server Component memuat ulang daftar.
 */
export function UsersView({
  staff,
  canManageGlobal,
  canManageLocal,
  outlets,
}: {
  staff: StaffMember[];
  canManageGlobal: boolean;
  canManageLocal: boolean;
  outlets: OutletOpt[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const canEdit = canManageGlobal || canManageLocal;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Semua');
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [assignTarget, setAssignTarget] = useState<StaffMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);

  const filtered = staff.filter((s) => {
    if (!canManageGlobal && s.role === 'TENANT_OWNER') return false;
    if (roleFilter === 'Kasir' && s.role !== 'CASHIER') return false;
    if (roleFilter === 'Manajer' && s.role !== 'STORE_MANAGER') return false;
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleRoleFilter(f: RoleFilter) {
    setRoleFilter(f);
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  const activeCount = filtered.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Karyawan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola akun dan peran staf di semua outlet cabang Anda secara terpusat.
          </p>
        </div>
        {canManageGlobal && (
          <Button
            onClick={() => setShowCreate(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-2 rounded-xl shadow-sm w-full max-w-md focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all">
          <Search className="w-4 h-4 text-gray-400 ml-1 shrink-0" />
          <input
            type="text"
            placeholder="Cari nama atau email staf..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-2">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleRoleFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                roleFilter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={refresh}
            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400">Nama</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400">Outlet</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400">
                  Login Terakhir
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm text-gray-400">
                    {search ? 'Tidak ada karyawan yang cocok' : 'Belum ada karyawan'}
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${AVATAR_CLASS[s.role] ?? 'bg-gray-200 text-gray-600'}`}
                        >
                          {getInitials(s.name)}
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{s.email}</td>
                    <td className="px-6 py-4">
                      <RoleBadge role={s.role} />
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {s.outletRoles.length === 0
                        ? '—'
                        : s.outletRoles.map((r) => r.outlet.name).join(', ')}
                    </td>
                    <td className="px-6 py-4">
                      <StatusDot status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(s.lastLoginAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => setEditTarget(s)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canManageGlobal && (
                          <>
                            <button
                              type="button"
                              title="Assign Role Outlet"
                              onClick={() => setAssignTarget(s)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title={s.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                              onClick={() => setDeactivateTarget(s)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                s.status === 'ACTIVE'
                                  ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                                  : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                              }`}
                            >
                              {s.status === 'ACTIVE' ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Menampilkan{' '}
            <span className="font-semibold text-gray-900">{paginated.length}</span> dari{' '}
            <span className="font-semibold text-gray-900">{filtered.length}</span> karyawan
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                    p === page
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Total Staf</p>
            <p className="text-xl font-bold text-gray-900">{filtered.length} Orang</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Outlet Terdaftar</p>
            <p className="text-xl font-bold text-gray-900">{outlets.length} Outlet</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Staf Aktif</p>
            <p className="text-xl font-bold text-gray-900">
              {filtered.length > 0 ? Math.round((activeCount / filtered.length) * 100) : 0}%
              <span className="text-emerald-500 text-sm font-semibold ml-1">
                {activeCount} orang
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Dialogs — setelah mutasi, refresh() memuat ulang data dari server */}
      <CreateDialog
        open={showCreate}
        outlets={outlets}
        onClose={() => setShowCreate(false)}
        onSaved={refresh}
      />
      <EditDialog staff={editTarget} onClose={() => setEditTarget(null)} onSaved={refresh} />
      <AssignRoleDialog
        staff={assignTarget}
        outlets={outlets}
        onClose={() => setAssignTarget(null)}
        onSaved={refresh}
      />
      <DeactivateDialog
        staff={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirmed={refresh}
      />
    </div>
  );
}
