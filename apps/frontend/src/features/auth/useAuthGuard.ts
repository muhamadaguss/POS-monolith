'use client';

import { useSession } from 'next-auth/react';

/**
 * SHIM kompatibilitas — gerbang auth kini dilapis di atas session Auth.js.
 *
 * Dulu hook ini berjuang melawan hydration localStorage (failsafe timeout,
 * visibilitychange, dst). Dengan Auth.js + cookie, masalah hydration itu HILANG:
 * status sesi datang dari `useSession()` dan tidak pernah "stuck".
 *
 * Permukaan kembalian dipertahankan ({ ready, user, accessToken, hasRefresh })
 * agar layout lama tidak perlu diubah. Dipensiunkan saat layout dikonversi ke
 * pengecekan session server-side (lihat proxy.ts + layout async).
 */
export function useAuthGuard() {
  const { data: session, status } = useSession();
  const user = session?.user ?? null;

  return {
    // 'loading' → belum siap; selain itu siap (authenticated/unauthenticated).
    ready: status !== 'loading',
    user: user
      ? {
          id: user.id,
          name: user.name ?? '',
          email: user.email ?? '',
          role: user.role,
          tenantId: user.tenantId,
          currentOutletId: user.currentOutletId,
          permissions: user.permissions ?? [],
        }
      : null,
    accessToken: session?.backendAccessToken ?? null,
    // Ada sesi authenticated → anggap masih punya refresh (dikelola Auth.js server).
    hasRefresh: status === 'authenticated',
  };
}
