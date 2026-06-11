'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, ChevronLeft, History, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/features/auth/store';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { getShifts } from '@/features/shifts/api';
import { IDR, toNum, formatDateTime, formatTimeOnly } from '@/lib/format';
import type { ShiftListItem, ShiftStatus, PaginationMeta } from '@/features/shifts/types';

const STATUS_OPTIONS: { value: '' | ShiftStatus; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'OPEN', label: 'Berjalan' },
  { value: 'CLOSED', label: 'Ditutup' },
];

const PAGE_SIZE = 20;

function CashDifference({ value }: { value: number | string | null | undefined }) {
  const diff = toNum(value);
  const color = diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600';
  return (
    <span className={`font-semibold ${color}`}>
      {diff > 0 ? '+' : ''}
      {IDR.format(diff)}
    </span>
  );
}

function StatusBadge({ status }: { status: ShiftStatus }) {
  return status === 'OPEN' ? (
    <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide">
      Berjalan
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wide">
      Ditutup
    </span>
  );
}

function ShiftHistoryInner() {
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const isOwner = user?.role === 'TENANT_OWNER';

  // Owner lintas cabang: kosong = "Semua Cabang". Non-owner: terikat outlet aktif.
  const [filterOutletId, setFilterOutletId] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | ShiftStatus>('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<ShiftListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const effectiveOutletId = isOwner ? filterOutletId : (user?.currentOutletId ?? '');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getShifts({
        outletId: effectiveOutletId || undefined,
        status: filterStatus || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(res.items);
      setMeta(res.meta);
    } catch {
      // Gagal memuat (mis. token kedaluwarsa) — biarkan daftar kosong, jangan throw.
      setItems([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveOutletId, filterStatus, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Ganti filter selalu kembali ke halaman 1.
  function changeOutlet(value: string) {
    setFilterOutletId(value);
    setPage(1);
  }
  function changeStatus(value: '' | ShiftStatus) {
    setFilterStatus(value);
    setPage(1);
  }

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Shift</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar shift kasir yang pernah dibuka, beserta rekap kas
          </p>
        </div>
        <Link href="/shift">
          <Button variant="outline" className="rounded-xl gap-2">
            <Clock className="w-4 h-4" /> Kelola Shift
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-4">
        {isOwner && (
          <div className="space-y-1.5 min-w-[200px] flex-1">
            <Label htmlFor="filter-outlet">Outlet</Label>
            <select
              id="filter-outlet"
              value={filterOutletId}
              onChange={(e) => changeOutlet(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Cabang</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5 min-w-[160px] flex-1">
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => changeStatus(e.target.value as '' | ShiftStatus)}
            className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Daftar */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-900">Belum ada riwayat shift</p>
            <p className="text-xs text-gray-400 mt-1">
              Shift yang dibuka & ditutup akan muncul di sini
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((shift) => (
              <li key={shift.id}>
                <Link
                  href={`/shift/history/${shift.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">
                        {shift.outlet?.name ?? 'Outlet'}
                      </p>
                      <StatusBadge status={shift.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {shift.openedBy?.name ?? '-'} · Dibuka {formatDateTime(shift.openedAt)}
                      {shift.closedAt ? ` · Tutup ${formatTimeOnly(shift.closedAt)}` : ''}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-xs text-gray-400">{shift._count?.transactions ?? 0} transaksi</p>
                    {shift.status === 'CLOSED' && (
                      <p className="text-sm mt-0.5">
                        Selisih <CashDifference value={shift.cashDifference} />
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Halaman {meta.page} dari {totalPages} · {meta.total} shift
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
