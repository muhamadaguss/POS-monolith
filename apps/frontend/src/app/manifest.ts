import type { MetadataRoute } from 'next';

/**
 * Web App Manifest (PWA) — konvensi native Next.js App Router.
 * Membuat aplikasi installable ("Tambah ke layar utama") & jalan standalone.
 * Tema emerald-600 selaras brand Kasirku.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kasirku — Platform POS untuk UMKM',
    short_name: 'Kasirku',
    description: 'Kelola kasir, stok, laporan, dan staf dari satu platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    lang: 'id',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
