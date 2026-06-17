'use client';

import { Download } from 'lucide-react';
import { useInstallPrompt } from './useInstallPrompt';

/**
 * Tombol "Install aplikasi" untuk Sidebar. Hanya tampil bila browser mengizinkan
 * (event beforeinstallprompt tertangkap) & belum ter-install. Gaya selaras baris
 * aksi Sidebar lain (Ganti Password / Keluar).
 */
export function InstallButton() {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

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
