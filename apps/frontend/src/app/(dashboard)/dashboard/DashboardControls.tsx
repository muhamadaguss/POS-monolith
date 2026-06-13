'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import type { ReportPeriod } from '@/features/reports/shared';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hari ini' },
  { value: 'WEEK', label: '7 Hari' },
  { value: 'MONTH', label: '30 Hari' },
];

/**
 * Kontrol Dashboard Manager/Owner (RSC): pemilih cabang (Owner), preset periode,
 * & muat ulang. Mengubah URL searchParams (`router.push`) — Server Component induk
 * merender ulang dgn data baru. Tidak mem-fetch.
 */
export function DashboardControls({
  isOwner,
  outlets,
  selectedOutletId,
  period,
}: {
  isOwner: boolean;
  outlets: { id: string; name: string }[];
  selectedOutletId: string;
  period: ReportPeriod;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    startTransition(() => router.push(`/dashboard${qs ? `?${qs}` : ''}`));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isOwner && outlets.length > 0 && (
        <select
          aria-label="Pilih cabang"
          value={selectedOutletId}
          onChange={(e) => setParam('outlet', e.target.value)}
          className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Cabang</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setParam('period', p.value)}
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
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
        title="Muat ulang"
      >
        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
