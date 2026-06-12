import Link from 'next/link';
import { Clock, ChevronRight, History, Scale, Hourglass, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifySession, serverFetch } from '@/lib/session';
import {
  IDR,
  toNum,
  getInitials,
  formatDate,
  formatShiftRange,
  formatMinutes,
} from '@/lib/format';
import type {
  ShiftListResponse,
  ShiftStats,
  ShiftStatus,
  ShiftQuery,
} from '@/features/shifts/types';
import { ShiftHistoryToolbar } from './ShiftHistoryToolbar';

const PAGE_SIZE = 10;

/** Rentang tanggal (rolling) untuk preset 7/30 hari. */
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

type Period = '7' | '30' | 'CUSTOM';

interface SearchParams {
  status?: string;
  period?: string;
  start?: string;
  end?: string;
  search?: string;
  page?: string;
}

/** Bangun URL halaman ini dengan satu param diubah (untuk Link pagination). */
function buildHref(current: SearchParams, patch: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, String(v));
  }
  const qs = params.toString();
  return `/shift/history${qs ? `?${qs}` : ''}`;
}

export default async function ShiftHistoryPage({
  searchParams,
}: {
  // Next.js 16: searchParams adalah Promise.
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const user = session.user;

  // RBAC: hanya Manager/Owner (punya shift.manage). Tampilkan blok "Akses Ditolak"
  // inline (konsisten dgn pola RequirePermission lama; bukan redirect karena tak
  // ada route /unauthorized). Backend tetap sumber kebenaran (mutasi 403).
  if (!user.permissions?.includes('shift.manage')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hanya Manager atau Owner yang dapat melihat riwayat shift.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const isOwner = user.role === 'TENANT_OWNER';
  const effectiveOutletId = isOwner ? '' : (user.currentOutletId ?? '');

  const period = (sp.period as Period) ?? '7';
  const filterStatus = (sp.status as ShiftStatus | '') ?? '';
  const search = sp.search?.trim() ?? '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  // Rentang tanggal efektif.
  const range =
    period === '7'
      ? presetRange(7)
      : period === '30'
        ? presetRange(30)
        : sp.start && sp.end
          ? { startDate: sp.start, endDate: sp.end }
          : { startDate: undefined as string | undefined, endDate: undefined as string | undefined };

  const baseQuery: ShiftQuery = {
    outletId: effectiveOutletId || undefined,
    status: filterStatus || undefined,
    startDate: range.startDate,
    endDate: range.endDate,
    search: search || undefined,
  };

  // Manager tanpa outlet aktif: jangan fetch, tampilkan peringatan.
  const needsOutlet = !isOwner && !effectiveOutletId;

  let list: ShiftListResponse = { items: [], meta: { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 } };
  let stats: ShiftStats | null = null;

  if (!needsOutlet) {
    const qs = (q: ShiftQuery) => {
      const params = new URLSearchParams();
      if (q.outletId) params.set('outletId', q.outletId);
      if (q.status) params.set('status', q.status);
      if (q.startDate) params.set('startDate', q.startDate);
      if (q.endDate) params.set('endDate', q.endDate);
      if (q.search) params.set('search', q.search);
      if (q.page) params.set('page', String(q.page));
      if (q.limit) params.set('limit', String(q.limit));
      const s = params.toString();
      return s ? `?${s}` : '';
    };
    // Fetch paralel di server (data sudah ter-render saat HTML sampai ke klien).
    [list, stats] = await Promise.all([
      serverFetch<ShiftListResponse>(`/shifts${qs({ ...baseQuery, page, limit: PAGE_SIZE })}`),
      serverFetch<ShiftStats>(`/shifts/stats${qs(baseQuery)}`),
    ]);
  }

  const periodBadge = period === '7' ? '7 Hari' : period === '30' ? '30 Hari' : 'Custom';
  const meta = list.meta;
  const totalPages = meta.totalPages ?? 1;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 8);

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
          {/* Tombol export (blob download) butuh klien → di toolbar */}
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
          value={
            stats
              ? `${toNum(stats.totalCashDifference) > 0 ? '+' : ''}${IDR.format(toNum(stats.totalCashDifference))}`
              : '—'
          }
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

      {/* Toolbar interaktif (Client Component): search, status, periode, export */}
      <ShiftHistoryToolbar
        status={filterStatus}
        period={period}
        customStart={sp.start ?? ''}
        customEnd={sp.end ?? ''}
        search={search}
        query={baseQuery}
      />

      {/* Tabel (server-rendered; baris = Link navigasi) */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-[2.5fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>Informasi Shift</span>
          <span>Waktu</span>
          <span>Transaksi</span>
          <span className="text-right">Selisih Kas</span>
          <span className="w-4" />
        </div>

        {list.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-900">Belum ada riwayat shift</p>
            <p className="text-xs text-gray-400 mt-1">
              Coba ubah filter periode atau kata kunci pencarian
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.items.map((shift) => (
              <li key={shift.id}>
                <Link
                  href={`/shift/history/${shift.id}`}
                  className="grid grid-cols-1 md:grid-cols-[2.5fr_2fr_1fr_1fr_auto] gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
                >
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

                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{formatDate(shift.openedAt)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatShiftRange(shift.openedAt, shift.closedAt)}
                    </p>
                  </div>

                  <div className="text-sm text-gray-600">
                    {shift._count?.transactions ?? 0} transaksi
                  </div>

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

        {/* Pagination bernomor (Link → ubah ?page=) */}
        {meta.total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Menampilkan {(meta.page - 1) * meta.limit + 1}-
              {Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} shift
            </p>
            <div className="flex items-center gap-1">
              <PageLink
                disabled={page <= 1}
                href={buildHref(sp, { page: String(page - 1) })}
                label="Sebelumnya"
              />
              {pageNumbers.map((p) => (
                <Link
                  key={p}
                  href={buildHref(sp, { page: String(p) })}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </Link>
              ))}
              <PageLink
                disabled={page >= totalPages}
                href={buildHref(sp, { page: String(page + 1) })}
                label="Selanjutnya"
              />
            </div>
          </div>
        )}
      </div>

      {needsOutlet && (
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

/** Tombol pagination prev/next sebagai Link (disabled → span). */
function PageLink({ disabled, href, label }: { disabled: boolean; href: string; label: string }) {
  const base =
    'inline-flex items-center h-9 px-3 rounded-xl border text-sm font-medium transition-colors';
  if (disabled) {
    return (
      <span className={`${base} border-gray-200 text-gray-300 cursor-not-allowed`}>{label}</span>
    );
  }
  return (
    <Link href={href} className={`${base} border-gray-200 text-gray-700 hover:bg-gray-50`}>
      {label}
    </Link>
  );
}
