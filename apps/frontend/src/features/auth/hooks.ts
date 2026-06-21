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
      // Panggil backend langsung untuk dapat error message yang jelas
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
      const apiRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await apiRes.json();

      if (!apiRes.ok) {
        const errorMessage = body?.message || body?.error || 'Login gagal. Periksa kredensial Anda.';
        setError(errorMessage);
        return;
      }

      const data = body.data;
      if (!data) {
        setError('Login gagal. Data tidak valid dari server.');
        return;
      }

      // Login berhasil → set sesi Auth.js
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: payload.email,
        password: payload.password,
        tenantSlug: payload.tenantSlug ?? '',
      });

      if (!signInResult || signInResult.error) {
        setError('Login gagal. Periksa kembali kredensial Anda.');
        return;
      }

      // Redirect by role
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
      if (user.requiresPinVerification && !session.pinVerified) {
        window.location.href = user.hasPin ? '/verify-pin' : '/setup-pin';
        return;
      }
      if (outlets.length === 0) {
        setError('Akun Anda belum memiliki akses ke outlet manapun.');
        await signOut({ redirect: false });
        return;
      }
      if (outlets.length === 1) {
        await applySelectOutlet(outlets[0].id, update);
        return;
      }
      window.location.href = '/select-outlet';
    } catch {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
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
    await logoutAction();
    await signOut({ redirectTo: '/login' });
  }

  return { logout };
}

/**
 * Register hook — daftar akun baru + buat tenant + auto-login.
 *
 * Flow:
 * 1. POST /auth/register (backend buat tenant + user + outlet + generate token)
 * 2. signIn dengan token backend (Auth.js Credentials)
 * 3. Redirect ke dashboard
 */
export function useRegister() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { update } = useSession();

  async function register(data: {
    email: string;
    password: string;
    ownerName: string;
    businessName: string;
    businessSlug: string;
    outletName: string;
    plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  }) {
    setIsPending(true);
    setError(null);

    try {
      // 1. Panggil backend register API
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = await res.json();

      if (!res.ok) {
        const message =
          body?.message ||
          body?.error ||
          'Registrasi gagal. Silakan coba lagi.';
        setError(message);
        return;
      }

      // Backend return: { success: true, data: { accessToken, refreshToken, user, outlets } }
      const { accessToken, refreshToken, user, outlets } = body.data ?? body;

      // 2. Set token ke Auth.js session via signIn('credentials')
      //    Gunakan tenantSlug dari response register
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
        tenantSlug: data.businessSlug, // Gunakan slug dari form register
      });

      if (!signInResult || signInResult.error) {
        console.error('[REGISTER] signIn error:', signInResult?.error);
        setError('Registrasi berhasil tapi gagal login. Silakan login manual.');
        return;
      }

      // 3. Update session dengan token backend yang baru
      await update({
        backendAccessToken: accessToken,
        backendRefreshToken: refreshToken,
        outlets: outlets,
        outletUpdate: {
          currentOutletId: user.currentOutletId,
          role: user.role,
          permissions: user.permissions,
        },
      });

      // 4. Redirect ke dashboard
      window.location.href = '/dashboard';
      return;
    } catch (err) {
      console.error('[REGISTER] Error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsPending(false);
    }
  }

  return { register, isPending, error };
}
