'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { setApiAccessToken } from '@/lib/api';

/**
 * Menyalin backend access token dari session Auth.js ke holder modul `lib/api`,
 * agar axios (Client Component) bisa menyuntik Bearer pada request interceptor
 * yang sinkron. Dipasang di dalam SessionProvider.
 */
export function AuthTokenSync() {
  const { data: session } = useSession();
  useEffect(() => {
    setApiAccessToken(session?.backendAccessToken ?? null);
  }, [session?.backendAccessToken]);
  return null;
}
