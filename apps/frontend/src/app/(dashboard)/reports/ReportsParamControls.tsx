'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Update satu param di URL sembari mempertahankan sisanya. */
function useSetParam() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = (key: string, value: string, opts?: { resetPage?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (opts?.resetPage) params.delete('page');
    startTransition(() => router.push(`/reports?${params.toString()}`));
  };

  return { setParam, isPending };
}

/** Checkbox "Bandingkan periode sebelumnya" (tab Penjualan). `?compare=1`. */
export function CompareToggle({ checked }: { checked: boolean }) {
  const { setParam } = useSetParam();
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setParam('compare', e.target.checked ? '1' : '')}
        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />
      Bandingkan periode sebelumnya
    </label>
  );
}

/** Pemilih Top N produk (tab Produk Terlaris). `?limit=`. */
export function TopLimitSelect({ value }: { value: number }) {
  const { setParam } = useSetParam();
  return (
    <select
      aria-label="Jumlah produk terlaris"
      value={value}
      onChange={(e) => setParam('limit', e.target.value)}
      className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700"
    >
      <option value={10}>Top 10</option>
      <option value={25}>Top 25</option>
      <option value={50}>Top 50</option>
    </select>
  );
}
