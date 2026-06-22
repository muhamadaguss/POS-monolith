import type { Metadata } from 'next';
import LandingPage from './LandingPageClient';

export const metadata: Metadata = {
  title: 'Kasirku — Platform POS Digital untuk UMKM Indonesia',
  description:
    'Sistem POS all-in-one untuk UMKM Indonesia. Kelola kasir, stok multi-outlet, laporan real-time, dan karyawan dari satu platform. Gratis selamanya.',
  openGraph: {
    title: 'Kasirku — Platform POS Digital untuk UMKM Indonesia',
    description:
      'Kelola bisnis lebih cerdas dengan Kasirku. Gratis selamanya!',
  },
};

export default function Page() {
  return <LandingPage />;
}
