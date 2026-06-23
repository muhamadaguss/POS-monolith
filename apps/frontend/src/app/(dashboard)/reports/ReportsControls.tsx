'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exportSalesXlsx } from '@/features/reports/api';
import { apiErrorMessage } from '@/features/reports/api';
import type { ReportPeriod, DateRange } from '@/features/reports/shared';

const PRESETS: { value: ReportPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hari ini' },
  { value: 'WEEK', label: '7 Hari' },
  { value: 'MONTH', label: '30 Hari' },
  { value: 'CUSTOM', label: 'Custom' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export interface ReportsControlsState {
  isOwner: boolean;
  outlets: { id: string; name: string }[];
  pickedOutletId: string;
  preset: ReportPeriod;
  customStart: string;
  customEnd: string;
  /** Rentang efektif untuk export (sesuai filter aktif). */
  range: ReportPeriod | DateRange;
  outletParam?: string;
}

/**
 * Kontrol header halaman Laporan (RSC): pemilih cabang (Owner), preset periode,
 * rentang custom, muat ulang, & export Excel.
 *
 * Tidak mem-fetch data — mengubah URL searchParams (`router.push`); Server
 * Component induk merender ulang dgn data baru. Export tetap di klien (blob).
 */
export function ReportsControls({
  isOwner,
  outlets,
  pickedOutletId,
  preset,
  customStart,
  customEnd,
  range,
  outletParam,
}: ReportsControlsState) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Dorong perubahan filter ke URL. Param lain (tab/compare/limit) DIPERTAHANKAN
   * dgn merge ke searchParams aktif; `page` direset karena ganti periode/outlet
   * mengubah dataset (mulai dari halaman 1). Nilai kosong → hapus param.
   */
  function pushParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete('page');
    const qs = params.toString();
    startTransition(() => router.push(`/reports${qs ? `?${qs}` : ''}`));
  }

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      await exportSalesXlsx(range, outletParam);
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal mengunduh Excel.'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {isOwner && outlets.length > 0 && (
          <select
            aria-label="Pilih cabang"
            value={pickedOutletId}
            onChange={(e) => pushParams({ outlet: e.target.value })}
            className="h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
          >
            <option value="">Semua Cabang</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() =>
                pushParams(
                  p.value === 'CUSTOM'
                    ? { period: 'CUSTOM' }
                    : { period: p.value, from: '', to: '' },
                )
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                preset === p.value
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => startTransition(() => router.refresh())}
          title="Muat ulang"
        >
          <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export Excel
        </Button>
      </div>

      {preset === 'CUSTOM' && (
        <div className="flex items-end gap-3 flex-wrap rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
          <div>
            <Label htmlFor="r-from" className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              Dari
            </Label>
            <Input
              id="r-from"
              type="date"
              defaultValue={customStart || todayStr()}
              max={customEnd || todayStr()}
              onChange={(e) =>
                pushParams({ period: 'CUSTOM', from: e.target.value, to: customEnd || todayStr() })
              }
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="r-to" className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              Sampai
            </Label>
            <Input
              id="r-to"
              type="date"
              defaultValue={customEnd || todayStr()}
              min={customStart || undefined}
              max={todayStr()}
              onChange={(e) =>
                pushParams({ period: 'CUSTOM', from: customStart || todayStr(), to: e.target.value })
              }
              className="h-9"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </>
  );
}
