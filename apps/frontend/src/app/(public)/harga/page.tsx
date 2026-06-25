import type { Metadata } from 'next';
import HargaPage from './HargaPageClient';

export const metadata: Metadata = {
  title: 'Harga Kasirku — Gratis Selamanya untuk UMKM',
  description:
    'Paket harga Kasirku: Gratis selamanya untuk bisnis kecil. Tanpa batas waktu, tanpa kartu kredit. Pro & Enterprise tersedia.',
  alternates: {
    canonical: '/harga',
  },
  openGraph: {
    title: 'Harga Kasirku — POS Gratis untuk UMKM Indonesia',
    description:
      'Mulai gratis selamanya. Upgrade kapan pun Anda butuh fitur lebih.',
  },
};

export default function Page() {
  return <HargaPage />;
}
