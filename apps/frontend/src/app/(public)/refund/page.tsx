// ─────────────────────────────────────────────────────────────
// Refund Policy Page — /refund  (Server wrapper for SEO metadata)
// ─────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import RefundPageClient from './RefundPageClient';

export const metadata: Metadata = {
  title: 'Kebijakan Pengembalian Dana',
  description:
    'Kebijakan pengembalian dana (refund) Kasirku. Pelajari syarat refund, prosedur pengajuan, dan kebijakan pembatalan langganan.',
  openGraph: {
    title: 'Kebijakan Pengembalian Dana | Kasirku',
    description:
      'Kebijakan pengembalian dana dan pembatalan langganan Kasirku.',
  },
};

export default function RefundPage() {
  return <RefundPageClient />;
}
