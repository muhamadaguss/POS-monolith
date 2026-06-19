'use client';

import { Download, Share2 } from 'lucide-react';
import { useInstallPrompt } from './useInstallPrompt';

/**
 * Tombol "Install aplikasi" untuk Sidebar. Hanya tampil bila browser mengizinkan
 * (event beforeinstallprompt tertangkap) & belum ter-install. Gaya selaras baris
 * aksi Sidebar lain (Ganti Password / Keluar).
 * 
 * Fallback untuk iOS: tampilkan tombol "Add to Home Screen" yang mengarahkan ke cara install manual.
 */
export function InstallButton() {
  const { canInstall, promptInstall } = useInstallPrompt();

  // Cek iOS Safari (tanpa beforeinstallprompt)
  const isIOS = typeof navigator !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    !window.matchMedia('(display-mode: standalone)').matches;

  // Jika tidak bisa install via beforeinstallprompt dan bukan iOS, jangan tampil apa-apa
  if (!canInstall && !isIOS) return null;

  // iOS: tampilkan tombol dengan cara install manual
  if (isIOS) {
    return (
      <button
        type="button"
        onClick={() => {
          alert('Untuk install di iOS:\n1. Klik tombol Share di browser\n2. Pilih "Add to Home Screen"');
        }}
        className="mt-1 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
      >
        <Share2 className="w-4 h-4 shrink-0" />
        Install aplikasi
      </button>
    );
  }

  // Browser lain (Chrome/Edge/Android): pake beforeinstallprompt
  return (
    <button
      type="button"
      onClick={promptInstall}
      className="mt-1 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
    >
      <Download className="w-4 h-4 shrink-0" />
      Install aplikasi
    </button>
  );
}
