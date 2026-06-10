import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { OutletOption } from './api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  currentOutletId: string | null;
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** Semua outlet yang boleh diakses user — dipakai OutletSwitcher */
  outlets: OutletOption[];
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setOutlets: (outlets: OutletOption[]) => void;
  setCurrentOutlet: (outletId: string, role: string, permissions: string[]) => void;
  clear: () => void;
}

const STORAGE_KEY = 'kasirku-auth';

/**
 * Storage adapter kustom untuk Zustand persist.
 *
 * Inti perbaikan "token hilang padahal user & outlets ada":
 * Token (accessToken/refreshToken) DAN data Zustand (user/outlets) hidup di key
 * yang sama (`kasirku-auth`). Bug lama: setiap setUser/setOutlets memicu Zustand
 * menulis ulang seluruh key tanpa token (atau dengan token null dari state yang
 * belum hydrate) → token tertimpa.
 *
 * Dengan adapter ini, setItem SELALU baca nilai lama dulu lalu MEMPERTAHANKAN
 * accessToken/refreshToken yang sudah ada bila payload baru tidak membawanya.
 * Jadi siapa pun yang menulis (Zustand untuk user/outlets, atau persistTokens
 * untuk token) tidak akan pernah saling menghapus.
 */
const mergingStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const incoming = JSON.parse(value);
      const prevRaw = localStorage.getItem(name);
      const prev = prevRaw ? JSON.parse(prevRaw) : null;
      incoming.state = incoming.state ?? {};
      // Pertahankan token lama bila payload baru tidak menyertakannya.
      // PENTING: anggap string kosong '' SAMA seperti null/undefined — payload
      // dengan refreshToken '' (mis. dari setTokens(access, '') saat select-outlet)
      // TIDAK boleh menimpa refresh token valid yang sudah ada.
      const isEmpty = (v: unknown) => v == null || v === '';
      if (isEmpty(incoming.state.accessToken) && !isEmpty(prev?.state?.accessToken)) {
        incoming.state.accessToken = prev.state.accessToken;
      }
      if (isEmpty(incoming.state.refreshToken) && !isEmpty(prev?.state?.refreshToken)) {
        incoming.state.refreshToken = prev.state.refreshToken;
      }
      localStorage.setItem(name, JSON.stringify(incoming));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      outlets: [],
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setOutlets: (outlets) => set({ outlets }),
      setCurrentOutlet: (outletId, role, permissions) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, currentOutletId: outletId, role, permissions }
            : null,
        })),
      clear: () => {
        if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
        set({ accessToken: null, refreshToken: null, user: null, outlets: [] });
      },
    }),
    {
      name: STORAGE_KEY,
      // Persist SELURUH state (termasuk token). Adapter mergingStorage yang
      // menjamin token tak pernah tertimpa null antar penulisan.
      storage: {
        getItem: (name) => {
          const str = mergingStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => mergingStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => mergingStorage.removeItem(name),
      },
    },
  ),
);

/**
 * Hook untuk mengetahui apakah Zustand sudah selesai hydrate dari localStorage.
 *
 * Pakai useState + useEffect (bukan useSyncExternalStore) supaya tahan terhadap
 * bfcache / tab idle lama: begitu komponen render di klien, kita cek hasHydrated()
 * secara langsung. Bila sudah hydrated → true seketika. Bila belum → daftar ke
 * onFinishHydration. Ada juga failsafe: cek ulang saat tab kembali terlihat,
 * agar spinner tidak pernah stuck permanen.
 */
export function useAuthHydrated(): boolean {
  // Mulai false (konsisten SSR & render klien pertama → tidak ada hydration
  // mismatch). Effect menaikkannya ke true setelah Zustand selesai hydrate.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    // setState dijadwalkan async (microtask) agar tidak sinkron di body effect.
    const markHydrated = () => queueMicrotask(() => setHydrated(true));

    if (useAuthStore.persist.hasHydrated()) {
      markHydrated();
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(markHydrated);
    // Failsafe: saat tab kembali terlihat, pastikan tidak stuck permanen.
    const onVisible = () => {
      if (useAuthStore.persist.hasHydrated()) markHydrated();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hydrated]);

  return hydrated;
}
