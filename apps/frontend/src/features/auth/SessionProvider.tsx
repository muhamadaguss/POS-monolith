'use client';

import { useEffect } from 'react';
import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react';
import { AuthTokenSync } from './AuthTokenSync';
import { SessionErrorGuard } from './SessionErrorGuard';

/**
 * Membungkus app agar Client Component bisa pakai `useSession()`.
 * Dipasang di root layout. Tidak menerima `session` awal — Auth.js akan
 * mengambilnya via /api/auth/session (cookie HttpOnly).
 *
 * `refetchOnWindowFocus`: saat desktop bangun dari sleep / tab kembali fokus,
 * useSession memvalidasi ulang sesi ke /api/auth/session → memicu callback jwt
 * (rotasi/penandaan error). Bila refresh gagal, `SessionErrorGuard` menendang
 * ke /login alih-alih membiarkan halaman "stuck loading" dengan token basi.
 *
 * `AuthTokenSync` menyalin backend access token ke holder axios (`lib/api`).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchOnWindowFocus
      // Auto-refresh session setiap 2 menit untuk mencegah token kedaluwarsa
      // saat user tidak berinteraksi (sleep, tab inactive)
      refetchInterval={2 * 60}
    >
      <AuthTokenSync />
      <SessionErrorGuard />
      <AuthVisibilityGuard />
      {children}
    </NextAuthSessionProvider>
  );
}

/**
 * Safety net: visibilitychange listener langsung redirect ke /login kalau
 * sesi sudah tidak valid atau stuck loading > 10 detik.
 * Ini menyelamatkan dari kasus dimana useSession() tetap 'loading'
 * karena network blom pulih setelah sleep.
 */
function AuthVisibilityGuard() {
  const { data: session, status, update } = useSession();

  useEffect(() => {
    function handleVisible() {
      if (status === 'loading') {
        // Jika masih loading saat visiblity berubah, set timeout
        const timeout = setTimeout(() => {
          // Cek ulang status setelah 10 detik
          if (status === 'loading') {
            window.location.href = '/login';
          }
        }, 10_000);
        return () => clearTimeout(timeout);
      }

      // Kalau sesi authenticated tapi ga punya user → corrupt, redirect
      if (status === 'authenticated' && !session?.user) {
        window.location.href = '/login';
      }
    }

    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [status, session]);

  return null;
}
