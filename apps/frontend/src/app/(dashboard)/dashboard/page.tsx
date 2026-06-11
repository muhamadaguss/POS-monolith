'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Tag,
  BarChart2,
  RefreshCw,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore, useAuthHydrated } from '@/features/auth/store';
import { usePageFocus } from '@/hooks/usePageFocus';
import { getSalesSummaryWithGrowth, getTopProducts } from '@/features/reports/api';
import { resolveImageUrl } from '@/features/products/api';
import { getActiveShift } from '@/features/shifts/api';
import { fetchCashierDailyStats } from '@/features/pos/api';
import { proactiveRefresh } from '@/lib/api';
import { SalesTrendChart, PaymentBreakdown } from '@/features/reports/components/charts';
import type { SalesSummaryWithGrowth, TopProduct, ReportPeriod } from '@/features/reports/api';
import type { Shift } from '@/features/shifts/types';
import { IDR, formatShiftDuration } from '@/lib/format';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hari ini' },
  { value: 'WEEK', label: '7 Hari' },
  { value: 'MONTH', label: '30 Hari' },
];

/**
 * Sub-label tarif pajak untuk kartu Pajak Terkumpul, dihitung dari data
 * (totalTax / totalSubtotal). Tanpa transaksi → undefined (sub disembunyikan).
 * - 1 cabang dipilih: tampilkan tarif asli yang dibulatkan, mis. "PPN 10%".
 * - Semua Cabang: tarif gabungan bisa pecahan → "PPN efektif 10,4%".
 */
function taxRateLabel(
  totalTax: number,
  totalSubtotal: number,
  singleOutlet: boolean,
): string | undefined {
  if (totalSubtotal <= 0) return undefined;
  const pct = (totalTax / totalSubtotal) * 100;
  if (singleOutlet) return `PPN ${Math.round(pct)}%`;
  return `PPN efektif ${pct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

/** Subjudul panel Tren Penjualan mengikuti periode aktif. */
const TREND_SUBTITLE: Record<ReportPeriod, string> = {
  TODAY: 'Performa hari ini',
  WEEK: 'Performa 7 hari terakhir',
  MONTH: 'Performa 30 hari terakhir',
  CUSTOM: 'Performa periode terpilih',
};

// Avatar inisial produk — fallback bila produk tak punya gambar (warna deterministik).
const PRODUCT_AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
];
function productAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PRODUCT_AVATAR_COLORS[hash % PRODUCT_AVATAR_COLORS.length];
}
function productInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Sel produk: gambar bila ada (fallback ke avatar inisial saat null/gagal muat). */
function ProductCell({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveImageUrl(imageUrl);
  return (
    <div className="flex items-center gap-3 min-w-0">
      {src ? (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="w-9 h-9 rounded-lg object-cover shrink-0 bg-gray-100"
        />
      ) : (
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${productAvatarColor(
            name,
          )}`}
        >
          {productInitials(name)}
        </div>
      )}
      <span className="font-medium text-gray-900 truncate">{name}</span>
    </div>
  );
}

/** Badge pertumbuhan (mis. +12% / −8%). Disembunyikan bila growth null. */
function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth === null) return null;
  const up = growth >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
      }`}
    >
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}
      {growth.toFixed(0)}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  /** Elemen di pojok kanan-atas (mis. badge growth). */
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge}
      </div>
      <p className="text-xs text-gray-500 font-medium mt-4">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Dashboard khusus Kasir ──────────────────────────────────────────────────

interface CashierStats {
  totalTransactions: number;
  totalRevenue: number;
}

function CashierDashboard({ outletId }: { outletId: string }) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [stats, setStats] = useState<CashierStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!outletId) return;
    await proactiveRefresh().catch(() => {});
    setIsLoading(true);
    try {
      const [activeShift, dailyStats] = await Promise.all([
        getActiveShift(outletId),
        fetchCashierDailyStats(outletId),
      ]);
      setShift(activeShift);
      setStats(dailyStats);
    } catch {
      // 401/refresh gagal sudah ditangani interceptor (redirect ke login).
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  useEffect(() => { load(); }, [load]);
  usePageFocus(load);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status shift */}
      {shift ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Shift Sedang Berjalan</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Dibuka {new Date(shift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                {' · '}{formatShiftDuration(shift.openedAt)} yang lalu
                {' · '}Kas awal {IDR.format(Number(shift.openingCash))}
              </p>
            </div>
          </div>
          <Link
            href="/shift"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            Kelola <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Belum Ada Shift Aktif</p>
              <p className="text-xs text-amber-700 mt-0.5">Buka shift untuk mulai menerima transaksi</p>
            </div>
          </div>
          <Link
            href="/shift"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
          >
            Buka Shift <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Statistik hari ini */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Transaksi Anda Hari Ini</p>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            icon={ShoppingCart}
            label="Total Transaksi"
            value={stats?.totalTransactions.toString() ?? '0'}
            sub="transaksi selesai"
            color="bg-blue-100 text-blue-600"
          />
          <KpiCard
            icon={TrendingUp}
            label="Total Omset"
            value={IDR.format(stats?.totalRevenue ?? 0)}
            sub="outlet hari ini"
            color="bg-emerald-100 text-emerald-600"
          />
        </div>
      </div>

      {/* Shortcut ke POS */}
      <Link
        href="/pos"
        className="flex items-center justify-center gap-2 w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
      >
        Mulai Kasir (POS)
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ── Dashboard Manager / Owner ───────────────────────────────────────────────

function ManagerDashboard({ isOwner, outlets }: { isOwner: boolean; outlets: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<ReportPeriod>('WEEK');
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const [summary, setSummary] = useState<SalesSummaryWithGrowth | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const outletIdParam = selectedOutletId || undefined;

  const load = useCallback(async () => {
    await proactiveRefresh().catch(() => {});
    setIsLoading(true);
    try {
      const [s, t] = await Promise.all([
        getSalesSummaryWithGrowth(period, outletIdParam),
        getTopProducts(period, outletIdParam),
      ]);
      setSummary(s);
      setTopProducts(t);
    } catch {
      // 401/refresh gagal sudah ditangani interceptor (redirect ke login).
      // Telan di sini agar tidak jadi unhandledRejection yang berisik.
    } finally {
      setIsLoading(false);
    }
  }, [period, outletIdParam]);

  useEffect(() => { load(); }, [load]);
  usePageFocus(load);

  const selectedOutletName = selectedOutletId
    ? (outlets.find((o) => o.id === selectedOutletId)?.name ?? 'Cabang')
    : 'Semua Cabang';

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ringkasan performa penjualan outlet</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter cabang — hanya untuk Owner */}
          {isOwner && outlets.length > 0 && (
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Cabang</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {isOwner && (
        <p className="text-xs text-gray-400 -mt-4 mb-4">
          Menampilkan data: <span className="font-semibold text-gray-600">{selectedOutletName}</span>
        </p>
      )}

      {isLoading || !summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={TrendingUp}
              label="Total Omzet"
              value={IDR.format(summary.totalRevenue)}
              sub={`${summary.totalTransactions} transaksi`}
              color="bg-emerald-100 text-emerald-600"
              badge={<GrowthBadge growth={summary.revenueGrowth} />}
            />
            <KpiCard
              icon={ShoppingCart}
              label="Total Transaksi"
              value={summary.totalTransactions.toString()}
              sub={`${summary.voidedCount} void`}
              color="bg-blue-100 text-blue-600"
            />
            <KpiCard
              icon={Tag}
              label="Total Diskon"
              value={IDR.format(summary.totalDiscount)}
              sub={summary.totalDiscount > 0 ? undefined : 'Tanpa promo'}
              color="bg-amber-100 text-amber-600"
            />
            <KpiCard
              icon={BarChart2}
              label="Pajak Terkumpul"
              value={IDR.format(summary.totalTax)}
              sub={taxRateLabel(summary.totalTax, summary.totalSubtotal, !!selectedOutletId)}
              color="bg-purple-100 text-purple-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Tren Penjualan</p>
                  <p className="text-xs text-gray-400 mt-0.5">{TREND_SUBTITLE[period]}</p>
                </div>
                <p className="text-xs text-gray-400">
                  Total {IDR.format(summary.totalRevenue)}
                </p>
              </div>
              <SalesTrendChart data={summary.dailyBreakdown} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Metode Pembayaran</p>
              <PaymentBreakdown data={summary.paymentBreakdown} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">Produk Terlaris</p>
              <Link
                href="/reports"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Lihat Semua
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-3 text-xs font-semibold text-gray-400 pr-4">#</th>
                    <th className="pb-3 text-xs font-semibold text-gray-400 pr-4">Produk</th>
                    <th className="pb-3 text-xs font-semibold text-gray-400 text-right pr-4">Terjual</th>
                    <th className="pb-3 text-xs font-semibold text-gray-400 text-right pr-4">Revenue</th>
                    <th className="pb-3 text-xs font-semibold text-gray-400 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.map((p, i) => (
                    <tr key={p.productId}>
                      <td className="py-3 pr-4 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <ProductCell name={p.productName} imageUrl={p.imageUrl} />
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600 tabular-nums">{p.quantitySold}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-gray-900 tabular-nums">{IDR.format(p.revenue)}</td>
                      <td className="py-3 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.margin >= 50 ? 'bg-emerald-100 text-emerald-700' :
                          p.margin >= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {p.margin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Root page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const outletId = user?.currentOutletId ?? '';
  const isOwner = user?.role === 'TENANT_OWNER';
  const canViewReports = user?.permissions?.includes('report.view') ?? false;

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-xl bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canViewReports ? (
        <ManagerDashboard isOwner={isOwner} outlets={outlets} />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Selamat datang, {user?.name}</p>
          </div>
          <CashierDashboard outletId={outletId} />
        </>
      )}
    </div>
  );
}
