// ─────────────────────────────────────────────────────────────
// Terms of Service Page — /terms  (Server wrapper for SEO metadata)
// ─────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import TermsPageClient from './TermsPageClient';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description:
    'Syarat dan ketentuan penggunaan platform POS Kasirku. Baca ketentuan layanan, batasan tanggung jawab, dan kebijakan privasi kami.',
  openGraph: {
    title: 'Syarat & Ketentuan | Kasirku',
    description:
      'Syarat dan ketentuan penggunaan platform POS Kasirku.',
  },
};

export default function TermsPage() {
  return <TermsPageClient />;
}
