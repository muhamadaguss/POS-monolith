'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import { getPlatformStats, listTenants } from '@/features/admin/api';
import type {
  PlatformStats,
  TenantListResult,
  TenantStatus,
  PlanCode,
} from '@/features/admin/types';
import { IDR } from '@/lib/format';

const STATUS_BADGE: Record<TenantStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  TRIAL: { label: 'Masa Coba', cls: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Ditangguhkan', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600' },
};

const PAGE_SIZE = 20;

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

export default function AdminTenantsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [data, setData] = useState<TenantListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('');
  const [planFilter, setPlanFilter] = useState<PlanCode | ''>('');
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Guard Super Admin.
  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [hydrated, user, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, d] = await Promise.all([
        getPlatformStats(),
        listTenants({
          search: search || undefined,
          status: statusFilter || undefined,
          plan: planFilter || undefined,
          page,
          limit: PAGE_SIZE,
        }),
      ]);
      setStats(s);
      setData(d);
    } catch {
      // 401 ditangani interceptor.
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, planFilter, page]);

  useEffect(() => {
    if (hydrated && user?.role === 'SUPER_ADMIN') load();
  }, [hydrated, user, load]);

  function handleSearchInput(v: string) {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 300);
  }

  if (!hydrated || !user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        <div>
          <span className="font-bold text-gray-900">Manajemen Tenant</span>
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            Super Admin
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="ml-auto p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Building2}
            label="Total Tenant"
            value={String(stats?.total ?? 0)}
            color="bg-gray-100 text-gray-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Aktif"
            value={String(stats?.active ?? 0)}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={Clock}
            label="Masa Coba"
            value={String(stats?.trial ?? 0)}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={Ban}
            label="Ditangguhkan"
            value={String(stats?.suspended ?? 0)}
            color="bg-red-100 text-red-600"
          />
          <StatCard
            icon={Wallet}
            label="Estimasi MRR"
            value={IDR.format(stats?.mrr ?? 0)}
            color="bg-violet-100 text-violet-600"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Cari nama / email / kode toko…"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TenantStatus | '');
              setPage(1);
            }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            <option value="">Semua status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="TRIAL">Masa Coba</option>
            <option value="SUSPENDED">Ditangguhkan</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value as PlanCode | '');
              setPage(1);
            }}
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
                {isLoading && items.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-5 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
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

          {meta && meta.total > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 bg-gray-50">
              <span>
                Menampilkan {(meta.page - 1) * meta.limit + 1}–
                {Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} tenant
              </span>
              {meta.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <span className="tabular-nums">
                    {meta.page} / {meta.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
