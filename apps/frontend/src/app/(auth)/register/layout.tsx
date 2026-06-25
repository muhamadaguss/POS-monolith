import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daftar Gratis — Kasirku POS Digital untuk UMKM',
  description:
    'Daftar gratis Kasirku. Kelola kasir, stok, dan laporan bisnis dalam satu platform. Trial 14 hari, tanpa kartu kredit.',
  openGraph: {
    title: 'Daftar Gratis Kasirku — Platform POS Digital UMKM Indonesia',
    description:
      'Mulai gratis selamanya. Kelola bisnis lebih cerdas dengan Kasirku.',
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
