'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Halaman fallback offline (PWA). Ditampilkan service worker saat navigasi
 * dokumen gagal karena offline & route belum ter-cache. Sengaja ringan & tanpa
 * dependensi data agar selalu bisa tampil dari precache.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
        <WifiOff className="h-7 w-7" />
      </div>
      <p className="text-base font-semibold text-gray-900">Anda sedang offline</p>
      <p className="max-w-xs text-sm text-gray-400">
        Periksa koneksi internet Anda, lalu coba lagi.
      </p>
      <Button
        onClick={() => window.location.reload()}
        variant="outline"
        className="mt-2 rounded-xl"
      >
        Coba lagi
      </Button>
    </div>
  );
}
