import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { VerifyPinForm } from './VerifyPinForm';

/**
 * Halaman verifikasi PIN — TOP-LEVEL (di luar group) agar reachable tanpa kena
 * gating layout. Gate kasir setelah login: wajib masukkan PIN sebelum lanjut.
 * Kalau bukan kasir / sudah terverifikasi / belum punya PIN, alihkan keluar.
 */
export default async function VerifyPinPage() {
  const session = await verifySession();
  const user = session.user;

  if (!user.requiresPinVerification || !user.hasPin) redirect('/');
  if (session.pinVerified) redirect('/pos');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Masukkan PIN</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verifikasi PIN Anda untuk memulai sesi kasir.
          </p>
          <VerifyPinForm />
        </div>
      </div>
    </div>
  );
}
