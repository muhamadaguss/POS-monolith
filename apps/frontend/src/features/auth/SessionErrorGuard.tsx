'use client';

import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';

/**
 * Penjaga reaktif untuk kegagalan refresh token.
 *
 * Saat desktop tidur lama (refresh token kedaluwarsa/di-revoke), Auth.js
 * menandai sesi dengan `error: 'RefreshTokenError'` di callback `jwt`, TAPI
 * tetap mengembalikan token (user masih ada). Client Component (layout
 * dashboard/POS via useAuthGuard) tidak melihat error itu, sehingga halaman
 * me-render dengan access token basi → request 401 / "stuck loading" hingga
 * user me-refresh manual (yang akhirnya melewati DAL `verifySession`).
 *
 * Komponen ini menutup celah itu: begitu `session.error` muncul, langsung
 * sign-out (hapus cookie sesi) lalu arahkan ke /login — tanpa refresh manual.
 * Dipasang sekali di dalam SessionProvider.
 */
export function SessionErrorGuard() {
  const { data: session } = useSession();
  const handled = useRef(false);

  useEffect(() => {
    if (session?.error === 'RefreshTokenError' && !handled.current) {
      handled.current = true; // cegah signOut ganda saat re-render
      void signOut({ redirectTo: '/login' });
    }
  }, [session?.error]);

  return null;
}
