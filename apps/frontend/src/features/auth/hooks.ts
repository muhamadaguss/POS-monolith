'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginApi, logoutApi, selectOutletApi, type LoginPayload } from './api';
import { useAuthStore } from './store';
import { useCartStore } from '@/features/pos/store';
import { getRefreshToken } from '@/lib/api';

export function useLogin() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setTokens, setUser, setOutlets } = useAuthStore();

  async function login(payload: LoginPayload) {
    setIsPending(true);
    setError(null);
    try {
      const data = await loginApi(payload);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setOutlets(data.outlets);

      if (data.user.role === 'SUPER_ADMIN') {
        window.location.href = '/admin';
        return;
      }

      // Owner langsung ke dashboard — tidak perlu pilih outlet
      if (data.user.role === 'TENANT_OWNER') {
        window.location.href = '/dashboard';
        return;
      }

      // Manager & Kasir wajib pilih outlet
      if (data.outlets.length === 0) {
        setError('Akun Anda belum memiliki akses ke outlet manapun. Hubungi administrator.');
        useAuthStore.getState().clear();
        return;
      }

      if (data.outlets.length === 1) {
        const outlet = data.outlets[0];
        const res = await selectOutletApi(outlet.id);
        // Simpan refresh token baru hasil rotasi (bukan yang lama dari login).
        setTokens(res.accessToken, res.refreshToken);
        useAuthStore.getState().setCurrentOutlet(res.currentOutletId, res.role, outlet.permissions);
        window.location.href = res.role === 'CASHIER' ? '/pos' : '/dashboard';
        return;
      }

      router.push('/select-outlet');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login gagal. Periksa kembali kredensial Anda.';
      setError(msg);
    } finally {
      setIsPending(false);
    }
  }

  return { login, isPending, error };
}

export function useSelectOutlet() {
  const [isPending, setIsPending] = useState(false);
  const { setTokens, setCurrentOutlet } = useAuthStore();

  async function selectOutlet(outletId: string, redirectTo?: string) {
    setIsPending(true);
    try {
      const res = await selectOutletApi(outletId);
      // Backend kini merotasi refresh token juga (currentOutletId konsisten).
      // Simpan PASANGAN baru — refresh token lama sudah dicabut backend.
      setTokens(res.accessToken, res.refreshToken);
      // Pakai role & permissions dari backend (untuk Owner: tetap TENANT_OWNER
      // dengan permissions global; untuk lainnya: role per-outlet).
      setCurrentOutlet(res.currentOutletId, res.role, res.permissions);
      // Tujuan: hormati redirect eksplisit (mis. dari menu POS), jika tidak —
      // CASHIER ke POS, lainnya ke dashboard.
      const dest = redirectTo || (res.role === 'CASHIER' ? '/pos' : '/dashboard');
      window.location.href = dest;
    } finally {
      setIsPending(false);
    }
  }

  return { selectOutlet, isPending };
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const clearCart = useCartStore((s) => s.clear);
  const router = useRouter();

  async function logout() {
    const refreshToken = getRefreshToken() ?? undefined;
    try {
      await logoutApi(refreshToken);
    } catch {
      // Server-side logout gagal — tetap bersihkan client state
    } finally {
      clear();
      clearCart();
      router.push('/login');
    }
  }

  return { logout };
}
