'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from './store';
import { hasUsableRefreshToken } from '@/lib/api';

/**
 * Gerbang auth terpusat untuk semua layout terproteksi.
 *
 * Tujuan utama: TIDAK PERNAH stuck di spinner. Ini menangani semua kasus yang
 * sebelumnya bikin "loading abadi" setelah sleep / pindah tab lama:
 *
 * 1. Saat tab kembali aktif (visibilitychange/pageshow), PAKSA Zustand membaca
 *    ulang localStorage (rehydrate) — menyembuhkan state in-memory yang menyimpang.
 * 2. FAILSAFE TIMEOUT: bila setelah `failsafeMs` masih "loading", anggap
 *    hydration selesai dan lanjut berdasarkan apa yang ada di storage. Spinner
 *    tidak akan menggantung selamanya walau ada race/anomali tak terduga.
 *
 * Mengembalikan { ready, user, accessToken, hasRefresh }.
 * `ready=true` artinya layout boleh berhenti menampilkan spinner & mengevaluasi
 * guard (redirect bila perlu).
 */
export function useAuthGuard(failsafeMs = 3000) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [ready, setReady] = useState<boolean>(() =>
    typeof window !== 'undefined' ? useAuthStore.persist.hasHydrated() : false,
  );

  useEffect(() => {
    let done = false;
    const markReady = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };

    // Sudah hydrated → siap.
    if (useAuthStore.persist.hasHydrated()) {
      markReady();
    } else {
      // Tunggu hydration selesai.
      const unsub = useAuthStore.persist.onFinishHydration(markReady);
      // Cek ulang (race antara render & efek).
      if (useAuthStore.persist.hasHydrated()) markReady();
      // FAILSAFE: jangan pernah stuck — setelah failsafeMs, anggap siap.
      const t = setTimeout(markReady, failsafeMs);
      return () => {
        unsub();
        clearTimeout(t);
      };
    }
  }, [failsafeMs]);

  // Saat tab kembali aktif: rehydrate dari storage agar state selalu sinkron,
  // dan pastikan ready (tidak stuck) walau hook hydration bermasalah.
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void useAuthStore.persist.rehydrate();
      setReady(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return {
    ready,
    user,
    accessToken,
    hasRefresh: typeof window !== 'undefined' ? hasUsableRefreshToken() : false,
  };
}
