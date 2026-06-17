'use client';

import { useEffect, useState } from 'react';

/**
 * Status koneksi (online/offline).
 *
 * `navigator.onLine` + event `online`/`offline` adalah sumber utama, TAPI tak
 * cukup andal sendirian: Chrome kadang TAK mengirim event `online` saat koneksi
 * pulih (apalagi bila di-toggle lewat DevTools, atau saat ada service worker
 * yang melayani dari cache) — badge bisa "nyangkut" di Offline padahal sudah
 * online. Karena itu kita juga lakukan verifikasi reachability ringan:
 *   - saat mount,
 *   - saat tab kembali fokus / kembali visible,
 *   - dan secara berkala (saat status sedang offline) untuk menyembuhkan diri.
 *
 * Mulai dari `true` (SSR tak punya navigator) lalu set nilai sebenarnya di
 * effect untuk menghindari mismatch hidrasi.
 */
export function useOnlineStatus() {
  // true di server (tak ada navigator); nilai nyata diisi di effect.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Verifikasi reachability sebenarnya, bukan sekadar percaya navigator.onLine.
    // HEAD ke aset same-origin yang pasti ada; cache:no-store agar betul-betul
    // mengenai jaringan. Sukses → online; gagal → offline.
    const checkReachable = async () => {
      // Bila browser yakin offline, percaya saja (negatif jarang salah).
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!cancelled) setOnline(false);
        return;
      }
      try {
        await fetch('/manifest.webmanifest', {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkReachable();
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    // Cek awal langsung saat mount.
    void checkReachable();

    // Penyembuh-diri: selama status offline, cek ulang berkala agar pulih
    // sendiri walau event `online` tak pernah datang.
    const interval = window.setInterval(() => {
      if (!navigator.onLine || !online) void checkReachable();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // `online` sengaja tak di-deps: interval membaca nilai terbaru via closure
    // baru tiap render hanya akan menyetel ulang interval; cukup pakai navigator.onLine
    // di dalam interval sebagai pemicu. Mount-once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return online;
}
