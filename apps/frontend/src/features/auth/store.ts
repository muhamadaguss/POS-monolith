'use client';

import { useSession } from 'next-auth/react';
import type { OutletOption } from './api';

/**
 * SHIM kompatibilitas — `useAuthStore` kini dilapis di atas session Auth.js,
 * BUKAN lagi Zustand + localStorage.
 *
 * Latar: migrasi auth ke cookie HttpOnly (Auth.js) + Server Components. Banyak
 * Client Component lama membaca `useAuthStore((s) => s.user)` / `.outlets` /
 * `.accessToken`. Agar tidak mengubah 20+ file sekaligus, hook ini menjaga
 * permukaan API yang sama tapi mengambil data dari `useSession()`.
 *
 * Method mutasi (setTokens/setUser/dst) jadi NO-OP — state dimiliki Auth.js.
 *
 * STATUS (model HYBRID): shim ini DIPERTAHANKAN, bukan kode mati. Halaman RSC
 * (dashboard/laporan/dll) sudah tak memakainya, TAPI Client Component yang
 * sengaja tetap client — terutama (pos)/* (offline-first untuk PWA), juga
 * products/outlets/shift/billing/inventory/admin — masih membacanya untuk tahu
 * user/outlet di sisi klien. Selama halaman-halaman itu client, shim ini tetap
 * ada sebagai lapis tipis di atas useSession(). Lihat memory rsc-pwa-boundary.
 */

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  currentOutletId: string | null;
  permissions: string[];
}

interface AuthShimState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  outlets: OutletOption[];
  /** Status sesi Auth.js: 'loading' | 'authenticated' | 'unauthenticated'. */
  status: 'loading' | 'authenticated' | 'unauthenticated';
  // ── Mutasi: NO-OP (Auth.js yang memiliki state) ──
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setOutlets: (outlets: OutletOption[]) => void;
  setCurrentOutlet: (outletId: string, role: string, permissions: string[]) => void;
  clear: () => void;
}

const noop = () => {};

/**
 * Hook kompatibel selector. Pemakaian yang didukung:
 *   useAuthStore((s) => s.user)
 *   useAuthStore((s) => s.outlets)
 *   const { accessToken, user } = useAuthStore()
 */
export function useAuthStore<T = AuthShimState>(selector?: (state: AuthShimState) => T): T {
  const { data: session, status } = useSession();

  const user = (session?.user as AuthUser | undefined) ?? null;
  const state: AuthShimState = {
    accessToken: session?.backendAccessToken ?? null,
    // refreshToken tak pernah diekspos ke klien (keamanan) — null di shim.
    refreshToken: null,
    user: user
      ? {
          id: user.id,
          name: user.name ?? '',
          email: user.email ?? '',
          role: user.role,
          tenantId: user.tenantId,
          currentOutletId: user.currentOutletId,
          permissions: user.permissions ?? [],
        }
      : null,
    outlets: session?.outlets ?? [],
    status,
    setTokens: noop,
    setUser: noop,
    setOutlets: noop,
    setCurrentOutlet: noop,
    clear: noop,
  };

  return selector ? selector(state) : (state as unknown as T);
}

/**
 * Kompat: dulu menandai Zustand selesai hydrate. Kini = session tidak 'loading'.
 * Hook lama dipakai beberapa halaman untuk menahan render sampai auth siap.
 */
export function useAuthHydrated(): boolean {
  const { status } = useSession();
  return status !== 'loading';
}
