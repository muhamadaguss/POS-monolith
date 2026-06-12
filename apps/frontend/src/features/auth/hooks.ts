'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useCartStore } from '@/features/pos/store';
import { selectOutletAction, logoutAction } from './actions';
import type { LoginPayload } from './api';

/**
 * Login via Auth.js Credentials provider.
 *
 * `signIn('credentials', { redirect:false })` memanggil `authorize()` di `auth.ts`,
 * yang mendelegasikan ke `POST /auth/login` backend & menaruh token backend ke
 * dalam JWT session (cookie HttpOnly). TIDAK ada lagi penyimpanan token di
 * localStorage / Zustand — ini menggantikan alur lama.
 *
 * Redirect by-role tetap di sini agar UX sama, tapi gating sebenarnya di proxy.ts.
 */
export function useLogin() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { update } = useSession();

  async function login(payload: LoginPayload) {
    setIsPending(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: payload.email,
        password: payload.password,
        tenantSlug: payload.tenantSlug ?? '',
      });

      if (!res || res.error) {
        // Auth.js v5 menyamarkan pesan error Credentials → tampilkan pesan umum.
        setError('Login gagal. Periksa email, password, dan kode toko Anda.');
        return;
      }

      // Sesi sudah terbentuk. Ambil sesi terbaru untuk menentukan tujuan & outlet.
      const session = await update();
      const user = session?.user;
      const outlets = session?.outlets ?? [];
      if (!user) {
        setError('Sesi tidak terbentuk. Coba lagi.');
        return;
      }

      if (user.role === 'SUPER_ADMIN') {
        window.location.href = '/admin';
        return;
      }
      if (user.role === 'TENANT_OWNER') {
        window.location.href = '/dashboard';
        return;
      }
      if (outlets.length === 0) {
        setError('Akun Anda belum memiliki akses ke outlet manapun. Hubungi administrator.');
        await signOut({ redirect: false });
        return;
      }
      if (outlets.length === 1) {
        await applySelectOutlet(outlets[0].id, update);
        return;
      }
      window.location.href = '/select-outlet';
    } catch {
      setError('Login gagal. Periksa kembali kredensial Anda.');
    } finally {
      setIsPending(false);
    }
  }

  return { login, isPending, error };
}

/**
 * Tukar outlet aktif: panggil `/auth/select-outlet` backend (rotasi token), lalu
 * perbarui JWT session Auth.js via `update()` (memicu callback jwt trigger 'update').
 */
async function applySelectOutlet(
  outletId: string,
  update: ReturnType<typeof useSession>['update'],
  redirectTo?: string,
) {
  // Server Action: berjalan di server, akses backend token dari session (server-only).
  const res = await selectOutletAction(outletId);
  // Perbarui sesi dengan token backend baru + currentOutletId/role/permissions baru.
  const refreshed = await update({
    backendAccessToken: res.accessToken,
    backendRefreshToken: res.refreshToken,
    outletUpdate: {
      currentOutletId: res.currentOutletId,
      role: res.role,
      permissions: res.permissions,
    },
  });
  const role = refreshed?.user?.role ?? res.role;
  const dest = redirectTo || (role === 'CASHIER' ? '/pos' : '/dashboard');
  window.location.href = dest;
}

export function useSelectOutlet() {
  const [isPending, setIsPending] = useState(false);
  const { update } = useSession();

  async function selectOutlet(outletId: string, redirectTo?: string) {
    setIsPending(true);
    try {
      await applySelectOutlet(outletId, update, redirectTo);
    } finally {
      setIsPending(false);
    }
  }

  return { selectOutlet, isPending };
}

export function useLogout() {
  const clearCart = useCartStore((s) => s.clear);

  async function logout() {
    clearCart();
    // Revoke refresh token backend dulu (Server Action, best-effort), lalu hapus
    // cookie sesi Auth.js & arahkan ke /login.
    await logoutAction();
    await signOut({ redirectTo: '/login' });
  }

  return { logout };
}
