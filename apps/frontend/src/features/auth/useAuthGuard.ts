'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

/**
 * SHIM kompatibilitas — gerbang auth dilapis di atas session Auth.js.
 *
 * Permukaan kembalian dipertahankan ({ ready, user, accessToken, hasRefresh })
 * agar layout lama tidak perlu diubah.
 *
 * STATUS (model HYBRID): dipakai oleh layout `(dashboard)` dan `(pos)` yang
 * masih Client Component. Gating optimistic server-side ada di proxy.ts; hook ini
 * adalah lapis gating di sisi klien untuk layout client.
 *
 * FAILSAFE "stuck loading": setelah idle lama, `GET /api/auth/session` bisa
 * lambat/menggantung (callback jwt menunggu refresh backend), sehingga
 * `useSession` terjebak status 'loading' → layout menampilkan spinner tanpa
 * batas (gejala: spinner muter, baru hilang setelah refresh manual). Bila
 * loading melewati STUCK_TIMEOUT, arahkan ke /login: halaman login ringan &
 * tak butuh sesi, jadi selalu termuat — user keluar dari spinner & bisa masuk
 * lagi (sesi yang macet diganti yang baru). Tak ada risiko loop reload.
 */

const STUCK_TIMEOUT_MS = 12_000;

export function useAuthGuard() {
  const { data: session, status } = useSession();
  const user = session?.user ?? null;
  const fired = useRef(false);

  useEffect(() => {
    if (status !== 'loading') {
      fired.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      window.location.href = '/login';
    }, STUCK_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [status]);

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
