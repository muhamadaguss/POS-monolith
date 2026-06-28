// ─────────────────────────────────────────────────────────────
// FAQ Page — /faq  (Server wrapper for SEO metadata)
// ─────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import FaqPageClient from './FaqPageClient';

export const metadata: Metadata = {
  title: 'Pertanyaan Umum (FAQ)',
  description:
    'Temukan jawaban untuk pertanyaan yang sering diajukan seputar Kasirku — dari cara daftar, fitur POS, pembayaran, hingga keamanan data.',
  openGraph: {
    title: 'Pertanyaan Umum (FAQ) | Kasirku',
    description:
      'Temukan jawaban untuk pertanyaan yang sering diajukan seputar Kasirku.',
  },
};

export default function FaqPage() {
  return <FaqPageClient />;
}
