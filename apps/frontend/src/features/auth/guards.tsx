'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './store';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Permission yang wajib dimiliki user. Jika tidak dikirim, cukup harus login. */
  requiredPermission?: string;
}

/**
 * Bungkus halaman yang butuh autentikasi dengan komponen ini.
 * Redirect ke /login jika user belum login.
 * Redirect ke /unauthorized jika user tidak punya permission yang dibutuhkan.
 */
export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }
    if (requiredPermission && !user.permissions.includes(requiredPermission)) {
      router.replace('/unauthorized');
    }
  }, [accessToken, user, requiredPermission, router]);

  if (!accessToken || !user) return null;
  if (requiredPermission && !user.permissions.includes(requiredPermission)) return null;

  return <>{children}</>;
}
