'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Bell } from 'lucide-react';
import { getInitials } from '@/lib/format';

/** Format detik → "HH:MM:SS". */
function fmtDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Header konsol Super Admin yang seragam untuk seluruh halaman admin.
 * - Kiri: logo K, (opsional) tombol Kembali, judul + badge INTERNAL ONLY + "Super Admin Console".
 * - Kanan: tanggal & "Sesi Aktif" (timer sejak halaman dimuat — dekoratif), tombol refresh
 *   (router.refresh), ikon notifikasi (dekoratif), avatar + nama admin, dan `extra` (mis. menu
 *   Ganti Password / Keluar di hub).
 */
export function AdminConsoleHeader({
  title,
  adminName,
  backHref,
  loginAt,
  extra,
}: {
  title: string;
  adminName: string;
  backHref?: string;
  /** Epoch ms saat login. Bila ada, "Sesi Aktif" dihitung dari sini (lintas halaman). */
  loginAt?: number;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // `now` di-tick tiap detik; `elapsed` diturunkan dari (now - loginAt) saat render.
  // Bila `loginAt` belum tersedia (mis. di hub yang membaca sesi via useSession
  // secara asinkron), JANGAN hitung dari mount (itu yang bikin timer "mulai 0"):
  // tampilkan placeholder hingga loginAt tiba, lalu timer langsung benar.
  const [now, setNow] = useState(() => Date.now());
  const elapsed =
    loginAt != null ? Math.max(0, Math.floor((now - loginAt) / 1000)) : null;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
      )}
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 shrink-0">
        <span className="text-white font-bold text-sm">K</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 truncate">{title}</span>
          <span className="hidden sm:inline text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 shrink-0">
            INTERNAL ONLY
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate">Super Admin Console</p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden lg:block text-right leading-tight">
          <p className="text-xs font-medium text-gray-700">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="text-[11px] text-gray-400 tabular-nums">
            Sesi Aktif: {elapsed != null ? fmtDuration(elapsed) : '—:—:—'}
          </p>
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
        <span className="relative hidden sm:inline-flex p-2 rounded-lg text-gray-400" aria-hidden>
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </span>
        <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l sm:border-gray-200 shrink-0">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(adminName)}
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-40">
            {adminName}
          </span>
        </div>
        {extra}
      </div>
    </header>
  );
}
