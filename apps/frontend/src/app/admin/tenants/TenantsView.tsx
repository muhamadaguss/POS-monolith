'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Eye,
  MoreVertical,
  Lock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/format';
import type { TenantListResult, TenantStatus, PlanCode } from '@/features/admin/types';

const STATUS_BADGE: Record<TenantStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  TRIAL: { label: 'Masa Coba', cls: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Ditangguhkan', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600' },
};

const PLAN_BADGE: Record<PlanCode, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-indigo-100 text-indigo-700',
  GROWTH: 'bg-emerald-100 text-emerald-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

const AVATAR_TINT = 'bg-emerald-100 text-emerald-700';

/** Bar kapasitas outlet (terpakai / batas). */
function OutletBar({ used, max }: { used: number; max: number }) {
  const unlimited = max >= 999;
  const ratio = unlimited ? 0.15 : max > 0 ? Math.min(1, used / max) : 0;
  const danger = !unlimited && ratio >= 0.9;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${danger ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.max(8, ratio * 100)}%` }}
        />
      </div>
      <span className="tabular-nums text-gray-600 text-xs">
        {used}/{unlimited ? '∞' : max}
      </span>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/**
 * Interaktivitas daftar tenant: filter (search/status/plan) & pagination via URL
 * searchParams (RSC refetch), navigasi ke detail, & kolom Actions. Tombol "Tambah
 * Tenant" placeholder disabled (provisioning belum tersedia). Data dari Server Component.
 */
export function TenantsView({
  data,
  search,
  status,
  plan,
  page,
}: {
  data: TenantListResult;
  search: string;
  status: string;
  plan: string;
  page: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);

  function pushParams(patch: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (resetPage) params.delete('page');
    startTransition(() => router.push(`/admin/tenants?${params.toString()}`));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ search: searchInput.trim() });
  }

  const open = (id: string) => router.push(`/admin/tenants/${id}`);

  const items = data.items;
  const meta = data.meta;
  const totalPages = meta.totalPages || 1;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            aria-label="Cari tenant"
            placeholder="Cari nama bisnis, email, atau ID tenant…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-gray-50 border-transparent"
          />
        </form>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => pushParams({ status: e.target.value })}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="TRIAL">Masa Coba</option>
          <option value="SUSPENDED">Ditangguhkan</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
        <select
          aria-label="Filter paket"
          value={plan}
          onChange={(e) => pushParams({ plan: e.target.value })}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Semua Paket</option>
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="GROWTH">Growth</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        {/* Placeholder: provisioning tenant belum tersedia. */}
        <button
          type="button"
          disabled
          title="Segera hadir"
          className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white opacity-60 cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Tambah Tenant
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">Bisnis</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Paket</th>
                <th className="px-5 py-3 font-medium">Outlet</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    Tidak ada tenant.
                  </td>
                </tr>
              ) : (
                items.map((t) => {
                  const suspended = t.status === 'SUSPENDED';
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-gray-50 transition-colors ${
                        suspended ? 'opacity-60' : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                      onClick={suspended ? undefined : () => open(t.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              suspended ? 'bg-gray-100 text-gray-400' : AVATAR_TINT
                            }`}
                          >
                            {getInitials(t.name)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-medium ${suspended ? 'text-gray-500 italic' : 'text-gray-900'}`}
                            >
                              {t.name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{t.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{t.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${PLAN_BADGE[t.plan]}`}
                        >
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <OutletBar used={t.outletCount} max={t.maxOutlets} />
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[t.status].cls}`}
                        >
                          {!suspended && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          {STATUS_BADGE[t.status].label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {suspended ? (
                          <div className="flex justify-end pr-2 text-gray-300" title="Terkunci">
                            <Lock className="w-4 h-4" />
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-end gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconBtn title="Ubah" onClick={() => open(t.id)}>
                              <Pencil className="w-4 h-4" />
                            </IconBtn>
                            <IconBtn title="Lihat detail" onClick={() => open(t.id)}>
                              <Eye className="w-4 h-4" />
                            </IconBtn>
                            <IconBtn title="Menu lain" disabled>
                              <MoreVertical className="w-4 h-4" />
                            </IconBtn>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta.total > 0 && (
          <div
            className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 bg-gray-50"
            aria-busy={isPending}
          >
            <span>
              Menampilkan {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} tenant
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => pushParams({ page: String(page - 1) }, false)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="tabular-nums px-2 py-0.5 rounded-md bg-emerald-600 text-white font-semibold">
                  {meta.page}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => pushParams({ page: String(page + 1) }, false)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
