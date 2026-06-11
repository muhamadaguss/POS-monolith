'use client';

import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from './store';

interface RequirePermissionProps {
  /** Salah satu permission ini cukup untuk mengakses (any-of). */
  anyOf: string[];
  children: React.ReactNode;
  /** Pesan opsional pada layar "Akses Ditolak". */
  message?: string;
}

/**
 * Guard halaman berbasis permission (client-side), konsisten dengan blokir menu
 * di Sidebar. Sidebar hanya MENYEMBUNYIKAN menu; tanpa guard ini, user masih bisa
 * membuka halaman dengan mengetik URL langsung (kebocoran tampilan data read).
 *
 * Pola tampilan mengikuti /billing: render blok "Akses Ditolak" (bukan redirect)
 * agar pengalaman seragam. Backend tetap sumber kebenaran (mutasi 403).
 */
export function RequirePermission({ anyOf, children, message }: RequirePermissionProps) {
  const user = useAuthStore((s) => s.user);
  const allowed = !!user && anyOf.some((p) => user.permissions.includes(p));

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-1">
          {message ?? 'Anda tidak memiliki izin untuk mengakses halaman ini.'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
