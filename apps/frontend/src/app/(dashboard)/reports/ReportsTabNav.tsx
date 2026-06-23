'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type ReportTab = 'sales' | 'analytics' | 'products' | 'shifts';

const TABS: { value: ReportTab; label: string }[] = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'analytics', label: 'Analitik' },
  { value: 'products', label: 'Produk Terlaris' },
  { value: 'shifts', label: 'Rekap Shift' },
];

/**
 * Navigasi tab Laporan (RSC). Mengubah `?tab=` di URL — Server Component induk
 * merender konten tab yang sesuai di server. Param lain (periode/outlet)
 * dipertahankan; `page` direset saat ganti tab agar tabel mulai dari hal. 1.
 */
export function ReportsTabNav({ active }: { active: ReportTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectTab(tab: ReportTab) {
    if (tab === active) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.delete('page'); // reset pagination antar tab
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700/30" aria-busy={isPending}>
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => selectTab(t.value)}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            active === t.value
              ? 'border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
