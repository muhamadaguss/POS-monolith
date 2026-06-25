import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Kasirku — Platform POS Digital untuk UMKM Indonesia',
    template: '%s | Kasirku',
  },
  description:
    'Sistem POS all-in-one: kelola kasir, stok multi-outlet, laporan real-time, dan karyawan dari satu platform. Gratis selamanya untuk bisnis kecil.',
  metadataBase: new URL('https://kasirku.jobmarket.my.id'),
  alternates: {
    canonical: '/',
    languages: {
      'id-ID': '/',
    },
  },
  openGraph: {
    title: 'Kasirku — Platform POS Digital untuk UMKM Indonesia',
    description:
      'Kelola bisnis lebih cerdas dengan Kasirku. Gratis selamanya!',
    url: 'https://kasirku.jobmarket.my.id',
    siteName: 'Kasirku',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kasirku — Platform POS Digital untuk UMKM Indonesia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kasirku — Platform POS Digital',
    description:
      'Kelola bisnis lebih cerdas dengan Kasirku. Gratis selamanya!',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
