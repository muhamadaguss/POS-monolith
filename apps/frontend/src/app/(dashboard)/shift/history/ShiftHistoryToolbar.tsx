'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportShifts } from '@/features/shifts/api';
import { errorAlert, toastSuccess } from '@/lib/swal';
import type { ShiftStatus, ShiftQuery } from '@/features/shifts/types';

type Period = '7' | '30' | 'CUSTOM';

const STATUS_OPTIONS: { value: '' | ShiftStatus; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'OPEN', label: 'Berjalan' },
  { value: 'CLOSED', label: 'Ditutup' },
];

/**
 * Toolbar interaktif untuk halaman Riwayat Shift (RSC).
 *
 * Tidak mem-fetch data — ia mengubah URL searchParams (`router.push`), lalu Server
 * Component induk merender ulang dengan data baru. Filter = state URL, bukan state lokal.
 * Export tetap di klien (blob download).
 */
export function ShiftHistoryToolbar({
  status,
  period,
  customStart,
  customEnd,
  search,
  query,
}: {
  status: '' | ShiftStatus;
  period: Period;
  customStart: string;
  customEnd: string;
  search: string;
  /** Query efektif saat ini (untuk export sesuai filter). */
  query: ShiftQuery;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [isExporting, setIsExporting] = useState(false);

  /** Dorong perubahan filter ke URL (reset page kecuali diminta lain). */
  const pushParams = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams();
      const merged: Record<string, string> = {
        status: status || '',
        period,
        start: customStart,
        end: customEnd,
        search,
        ...patch,
      };
      // Saat filter berubah, kembali ke halaman 1 (kecuali patch membawa page).
      if (!('page' in patch)) delete merged.page;
      for (const [k, v] of Object.entries(merged)) {
        if (v) params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => router.push(`/shift/history${qs ? `?${qs}` : ''}`));
    },
    [router, status, period, customStart, customEnd, search],
  );

  // Debounce input pencarian (350ms) → push ke URL.
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const t = setTimeout(() => pushParams({ search: searchInput.trim() }), 350);
    return () => clearTimeout(t);
  }, [searchInput, search, pushParams]);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportShifts(query);
      toastSuccess('Riwayat shift diunduh');
    } catch {
      errorAlert('Gagal mengunduh riwayat shift');
    } finally {
      setIsExporting(false);
    }
  }

  const busy = isPending || isExporting;

  return (
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
          value={status}
          onChange={(e) => pushParams({ status: e.target.value })}
          className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 ml-auto">
          {(['7', '30'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => pushParams({ period: p, start: '', end: '' })}
              className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${
                period === p ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p} Hari
            </button>
          ))}
          <button
            type="button"
            onClick={() => pushParams({ period: 'CUSTOM' })}
            className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${
              period === 'CUSTOM' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Custom
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="h-11 px-4 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> {isExporting ? 'Mengunduh...' : 'Export'}
          </button>
        </div>
      </div>

      {period === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            aria-label="Tanggal mulai"
            defaultValue={customStart}
            onChange={(e) => pushParams({ period: 'CUSTOM', start: e.target.value, end: customEnd })}
            className="h-11 rounded-xl w-auto"
          />
          <span className="text-gray-400">—</span>
          <Input
            type="date"
            aria-label="Tanggal akhir"
            defaultValue={customEnd}
            onChange={(e) => pushParams({ period: 'CUSTOM', start: customStart, end: e.target.value })}
            className="h-11 rounded-xl w-auto"
          />
        </div>
      )}
    </div>
  );
}
