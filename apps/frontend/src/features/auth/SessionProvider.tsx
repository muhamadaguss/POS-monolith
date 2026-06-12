'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { AuthTokenSync } from './AuthTokenSync';

/**
 * Membungkus app agar Client Component bisa pakai `useSession()`.
 * Dipasang di root layout. Tidak menerima `session` awal — Auth.js akan
 * mengambilnya via /api/auth/session (cookie HttpOnly).
 *
 * `AuthTokenSync` menyalin backend access token ke holder axios (`lib/api`).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <AuthTokenSync />
      {children}
    </NextAuthSessionProvider>
  );
}
