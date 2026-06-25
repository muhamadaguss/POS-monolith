import type { Metadata } from 'next';
import FiturPage from './FiturPageClient';

export const metadata: Metadata = {
  title: 'Fitur Lengkap POS untuk UMKM',
  description:
    'Jelajahi semua fitur Kasirku: kasir cepat offline, stok multi-outlet, laporan real-time, manajemen karyawan, import CSV, barcode scanner, dan banyak lagi.',
  alternates: {
    canonical: '/fitur',
  },
  openGraph: {
    title: 'Fitur Kasirku — Platform POS Digital UMKM',
    description:
      'Kasir cepat, stok multi-outlet, laporan real-time, dan manajemen karyawan dalam satu platform.',
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Beranda', item: 'https://kasirku.jobmarket.my.id/' },
              { '@type': 'ListItem', position: 2, name: 'Fitur', item: 'https://kasirku.jobmarket.my.id/fitur' },
            ],
          }),
        }}
      />
      <FiturPage />
    </>
  );
}
