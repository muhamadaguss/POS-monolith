// ─────────────────────────────────────────────────────────────
// Kontak Page — /kontak  (Server wrapper for SEO metadata)
// ─────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import KontakPageClient from './KontakPageClient';

export const metadata: Metadata = {
  title: 'Hubungi Kami',
  description:
    'Hubungi tim support Kasirku. Kirim pesan, email, atau telepon kami untuk bantuan dan informasi kemitraan.',
  openGraph: {
    title: 'Hubungi Kami | Kasirku',
    description: 'Kirim pesan atau hubungi tim support Kasirku.',
  },
};

export default function KontakPage() {
  return <KontakPageClient />;
}
