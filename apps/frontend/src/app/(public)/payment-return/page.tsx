// ─────────────────────────────────────────────────────────────
// Payment Return Relay — /payment-return
// Menerima redirect dari iPaymu → teruskan params ke /billing
// Verifikasi dilakukan client-side di billing page (lebih robust)
// ─────────────────────────────────────────────────────────────
import { redirect } from 'next/navigation';

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const sid = params.sid || '';
  const trx_id = params.trx_id || '';
  const status = params.status || '';

  if (!sid) {
    redirect('/billing?payment_status=error&message=missing_sid');
  }

  // Teruskan semua params ke billing page untuk verifikasi client-side
  redirect(`/billing?payment_status=return&sid=${encodeURIComponent(sid)}&trx_id=${encodeURIComponent(trx_id)}&status=${encodeURIComponent(status)}`);
}
