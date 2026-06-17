'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
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
    <NextAuthSessionProvider refetchOnWindowFocus>
      <AuthTokenSync />
      <SessionErrorGuard />
      {children}
    </NextAuthSessionProvider>
  );
}
