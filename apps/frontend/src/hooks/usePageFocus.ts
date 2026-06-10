'use client';

import { useEffect } from 'react';
import { proactiveRefresh } from '@/lib/api';

/**
 * Memanggil callback saat halaman kembali aktif dari:
 * - bfcache restore (tab berpindah lama lalu kembali)
 * - browser back/forward navigation
 *
 * Sebelum memanggil callback, cek apakah access token sudah/hampir expired
 * dan refresh dulu jika perlu — mencegah 401 setelah desktop sleep atau
 * tab lama tidak aktif.
 */
export function usePageFocus(callback: () => void) {
  useEffect(() => {
    // Saat desktop bangun dari sleep, `pageshow` (bfcache) dan
    // `visibilitychange` bisa menyala hampir bersamaan. Debounce singkat
    // mencegah onFocus berjalan dua kali dalam satu tick — penting karena
    // tiap onFocus memicu refresh & reload.
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onFocus() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // Picu refresh di latar belakang, TAPI jangan menahan callback di
        // belakangnya: kalau proactiveRefresh menggantung (request beku saat
        // halaman masuk bfcache lalu tak resolve setelah restore), data tak
        // akan pernah dimuat → "stuck loading, harus refresh manual". Request
        // di dalam callback punya interceptor 401 sendiri untuk refresh.
        proactiveRefresh().catch(() => { /* redirect ditangani di dalam */ });
        callback();
      }, 150);
    }

    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) onFocus();
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') onFocus();
    }

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  // callback sengaja tidak dimasukkan deps — kita hanya ingin register listener sekali
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
