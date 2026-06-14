'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Bell } from 'lucide-react';

/** Format detik → "HH:MM:SS". */
function fmtDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Aksi & info header konsol: timer "Sesi Aktif" (sejak halaman dimuat — dekoratif),
 * tombol refresh (router.refresh → re-fetch RSC), dan ikon notifikasi (dekoratif).
 */
export function UserHeaderActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:block text-right leading-tight">
        <p className="text-xs font-medium text-gray-700">
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <p className="text-[11px] text-gray-400 tabular-nums">Sesi Aktif: {fmtDuration(elapsed)}</p>
      </div>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        title="Muat ulang data"
        aria-label="Muat ulang data"
        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
      </button>
      {/* Notifikasi dekoratif (belum difungsikan). */}
      <span className="relative p-2 rounded-lg text-gray-400" aria-hidden>
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
      </span>
    </div>
  );
}
