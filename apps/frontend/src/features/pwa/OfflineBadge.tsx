'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Badge global "Offline" — muncul di pojok bawah saat koneksi putus, agar kasir
 * sadar transaksi mungkin tak terkirim. Dipasang di root layout.
 */
export function OfflineBadge() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      <WifiOff className="h-4 w-4" />
      Offline
    </div>
  );
}
