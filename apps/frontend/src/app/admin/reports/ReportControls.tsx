'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { errorAlert } from '@/lib/swal';
import type { ReportPeriod } from '@/features/admin/types';

const PRESETS: { value: ReportPeriod; label: string }[] = [
  { value: '30d', label: '30 Hari' },
  { value: '90d', label: '90 Hari' },
  { value: 'ytd', label: 'Tahun Ini' },
  { value: 'custom', label: 'Kustom' },
];

/**
 * Kontrol periode (preset + custom date) + tombol ekspor Excel untuk Laporan
 * Platform. Periode ditulis ke URL searchParams → Server Component refetch.
 */
export function ReportControls({
  period,
  startDate,
  endDate,
}: {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);

  function setParam(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.push(`/admin/reports?${params}`));
  }

  async function exportXlsx() {
    setDownloading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      const { data } = await api.get(`/admin/reports/export?${params}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kasirku-laporan-platform-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      errorAlert('Gagal mengunduh laporan Excel');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setParam({ period: p.value })}
            disabled={isPending}
            className={`px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-amber-500 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setParam({ period: 'custom', startDate: e.target.value })}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setParam({ period: 'custom', endDate: e.target.value })}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
      )}

      <div className="ml-auto">
        <Button
          type="button"
          onClick={exportXlsx}
          disabled={downloading}
          variant="outline"
          className="rounded-lg"
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Ekspor Excel
        </Button>
      </div>
    </div>
  );
}
