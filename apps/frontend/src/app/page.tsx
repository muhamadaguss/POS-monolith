'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAuthHydrated } from '@/features/auth/store';

export default function RootPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;

    // Baca state setelah hydrate selesai — arahkan sesuai login state & role.
    const { accessToken, user } = useAuthStore.getState();

    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }

    switch (user.role) {
      case 'SUPER_ADMIN':
        router.replace('/admin');
        break;
      case 'CASHIER':
        router.replace('/pos');
        break;
      case 'TENANT_OWNER':
        router.replace('/dashboard');
        break;
      default: // STORE_MANAGER
        router.replace(user.currentOutletId ? '/dashboard' : '/select-outlet');
    }
  }, [hydrated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
