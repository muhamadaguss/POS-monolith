'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  ChevronRight,
  History,
  Scale,
  Hourglass,
  Search,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/features/auth/store';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { getShifts, getShiftStats, exportShifts } from '@/features/shifts/api';
import { errorAlert, toastSuccess } from '@/lib/swal';
import {
  IDR,
  toNum,
  getInitials,
  formatDate,
  formatShiftRange,
  formatMinutes,
} from '@/lib/format';
import type {
  ShiftListItem,
  ShiftStatus,
  PaginationMeta,
  ShiftStats,
  ShiftQuery,
} from '@/features/shifts/types';

const STATUS_OPTIONS: { value: '' | ShiftStatus; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'OPEN', label: 'Berjalan' },
  { value: 'CLOSED', label: 'Ditutup' },
];

type Period = '7' | '30' | 'CUSTOM';
const PAGE_SIZE = 10;

/** Rentang tanggal (rolling) untuk preset 7/30 hari. CUSTOM dikelola terpisah. */
function presetRange(days: number): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  return { startDate: fmt(start), endDate: fmt(today) };
}

function cashColor(diff: number): string {
  return diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600';
}

function CashAmount({ value }: { value: number | string | null | undefined }) {
  const diff = toNum(value);
  return (
    <span className={`font-semibold ${cashColor(diff)}`}>
      {diff > 0 ? '+' : ''}
      {IDR.format(diff)}
    </span>
  );
}

function StatusBadge({ status }: { status: ShiftStatus }) {
  return status === 'OPEN' ? (
    <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wide">
      Berjalan
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase tracking-wide">
      Ditutup
    </span>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  badge,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  badge: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 rounded-full px-2.5 py-1">
          {badge}
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-4">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${valueColor ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function ShiftHistoryInner() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'TENANT_OWNER';

  const [filterStatus, setFilterStatus] = useState<'' | ShiftStatus>('');
  const [period, setPeriod] = useState<Period>('7');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<ShiftListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const effectiveOutletId = isOwner ? '' : (user?.currentOutletId ?? '');

  // Debounce input pencarian (350ms) → set `search` yang memicu reload.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Rentang tanggal efektif yang dikirim ke API.
  const range = useMemo(() => {
    if (period === '7') return presetRange(7);
    if (period === '30') return presetRange(30);
    // CUSTOM: hanya kirim bila kedua tanggal terisi.
    return customStart && customEnd
      ? { startDate: customStart, endDate: customEnd }
      : { startDate: undefined, endDate: undefined };
  }, [period, customStart, customEnd]);

  const baseQuery: ShiftQuery = useMemo(
    () => ({
      outletId: effectiveOutletId || undefined,
      status: filterStatus || undefined,
      startDate: range.startDate,
      endDate: range.endDate,
      search: search || undefined,
    }),
    [effectiveOutletId, filterStatus, range.startDate, range.endDate, search],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        getShifts({ ...baseQuery, page, limit: PAGE_SIZE }),
        getShiftStats(baseQuery),
      ]);
      setItems(listRes.items);
      setMeta(listRes.meta);
      setStats(statsRes);
    } catch {
      setItems([]);
      setMeta(null);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportShifts(baseQuery);
      toastSuccess('Riwayat shift diunduh');
    } catch {
      errorAlert('Gagal mengunduh riwayat shift');
    } finally {
      setIsExporting(false);
    }
  }

  const totalPages = meta?.totalPages ?? 1;
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p += 1) pages.push(p);
    return pages.slice(0, 8); // batasi tampilan nomor agar ringkas
  }, [totalPages]);

  const periodBadge = period === '7' ? '7 Hari' : period === '30' ? '30 Hari' : 'Custom';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Shift</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar shift kasir yang pernah dibuka, beserta rekap kas.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" /> {isExporting ? 'Mengunduh...' : 'Export'}
          </Button>
          <Link href="/shift">
            <Button className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Clock className="w-4 h-4" /> Kelola Shift
            </Button>
          </Link>
        </div>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={History}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Shift"
          badge={periodBadge}
          value={stats ? String(stats.totalShifts) : '—'}
        />
        <StatCard
          icon={Scale}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          label="Total Selisih Kas"
          badge={periodBadge}
          value={stats ? `${toNum(stats.totalCashDifference) > 0 ? '+' : ''}${IDR.format(toNum(stats.totalCashDifference))}` : '—'}
          valueColor={stats ? cashColor(toNum(stats.totalCashDifference)) : undefined}
        />
        <StatCard
          icon={Hourglass}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Durasi Shift"
          badge="Rata-rata"
          value={stats ? formatMinutes(stats.avgDurationMinutes) : '—'}
        />
      </div>

      {/* Toolbar: search + status + periode */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              aria-label="Cari shift atau kasir"
              placeholder="Cari shift atau kasir..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>
          <select
            aria-label="Status"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as '' | ShiftStatus);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {/* Preset periode */}
          <div className="flex items-center gap-1 ml-auto">
            {(['7', '30'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setPage(1);
                }}
                className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p} Hari
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPeriod('CUSTOM');
                setPage(1);
              }}
              className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${
                period === 'CUSTOM'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Input tanggal custom */}
        {period === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              aria-label="Tanggal mulai"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl w-auto"
            />
            <span className="text-gray-400">—</span>
            <Input
              type="date"
              aria-label="Tanggal akhir"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl w-auto"
            />
          </div>
        )}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header kolom */}
        <div className="hidden md:grid grid-cols-[2.5fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>Informasi Shift</span>
          <span>Waktu</span>
          <span>Transaksi</span>
          <span className="text-right">Selisih Kas</span>
          <span className="w-4" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-900">Belum ada riwayat shift</p>
            <p className="text-xs text-gray-400 mt-1">
              Coba ubah filter periode atau kata kunci pencarian
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((shift) => (
              <li key={shift.id}>
                <Link
                  href={`/shift/history/${shift.id}`}
                  className="grid grid-cols-1 md:grid-cols-[2.5fr_2fr_1fr_1fr_auto] gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
                >
                  {/* Informasi Shift */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
                      {getInitials(shift.openedBy?.name ?? '?')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {shift.outlet?.name ?? 'Outlet'}
                        </p>
                        <StatusBadge status={shift.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {shift.openedBy?.name ?? '-'}
                      </p>
                    </div>
                  </div>

                  {/* Waktu */}
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{formatDate(shift.openedAt)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatShiftRange(shift.openedAt, shift.closedAt)}
                    </p>
                  </div>

                  {/* Transaksi */}
                  <div className="text-sm text-gray-600">
                    {shift._count?.transactions ?? 0} transaksi
                  </div>

                  {/* Selisih Kas */}
                  <div className="text-sm md:text-right">
                    {shift.status === 'CLOSED' ? (
                      <CashAmount value={shift.cashDifference} />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  <ChevronRight className="hidden md:block w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination bernomor */}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Menampilkan {(meta.page - 1) * meta.limit + 1}-
              {Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} shift
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {!isOwner && !effectiveOutletId && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            Pilih outlet terlebih dahulu untuk melihat riwayat shift cabang Anda.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ShiftHistoryPage() {
  return (
    <RequirePermission
      anyOf={['shift.manage']}
      message="Hanya Manager atau Owner yang dapat melihat riwayat shift."
    >
      <ShiftHistoryInner />
    </RequirePermission>
  );
}
