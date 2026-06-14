'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { TenantListResult, TenantStatus } from '@/features/admin/types';

const STATUS_BADGE: Record<TenantStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  TRIAL: { label: 'Masa Coba', cls: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Ditangguhkan', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600' },
};

/**
 * Interaktivitas daftar tenant: filter (search/status/plan) & pagination via URL
 * searchParams (RSC refetch), plus navigasi ke detail. Data datang dari Server Component.
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

  const items = data.items;
  const meta = data.meta;
  const totalPages = meta.totalPages || 1;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            aria-label="Cari tenant"
            placeholder="Cari nama / email / kode toko…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 h-9 rounded-lg"
          />
        </form>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => pushParams({ status: e.target.value })}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="TRIAL">Masa Coba</option>
          <option value="SUSPENDED">Ditangguhkan</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
        <select
          aria-label="Filter paket"
          value={plan}
          onChange={(e) => pushParams({ plan: e.target.value })}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Semua paket</option>
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="GROWTH">Growth</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
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
                <th className="px-5 py-3 font-medium text-right">Outlet</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
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
                items.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/tenants/${t.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{t.slug}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{t.email}</td>
                    <td className="px-5 py-3 text-gray-700">{t.plan}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                      {t.outletCount}/{t.maxOutlets >= 999 ? '∞' : t.maxOutlets}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[t.status].cls}`}
                      >
                        {STATUS_BADGE[t.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 inline" />
                    </td>
                  </tr>
                ))
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
                <span className="tabular-nums">
                  {meta.page} / {totalPages}
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
