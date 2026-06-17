'use client';

import { useEffect, useState } from 'react';

/** Event `beforeinstallprompt` (belum di lib DOM standar). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Menangkap event `beforeinstallprompt` (Chrome/Edge/Android) agar aplikasi
 * bisa menampilkan tombol "Install" sendiri. Tombol disembunyikan bila app
 * sudah berjalan standalone atau sudah ter-install.
 *
 * Catatan: iOS Safari TIDAK meng-emit event ini → `canInstall` tetap false di
 * iOS (install lewat Share → Add to Home Screen). Itu perilaku yang diterima.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // tahan mini-infobar bawaan; kita pakai tombol sendiri
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // sekali pakai
  };

  return { canInstall: deferred !== null, promptInstall };
}
