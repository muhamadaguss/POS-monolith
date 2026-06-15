import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { SetupPinForm } from './SetupPinForm';

/**
 * Halaman buat PIN pertama kali — TOP-LEVEL. Kasir yang belum punya PIN wajib
 * membuatnya sebelum lanjut. Setelah dibuat, proxy mengarahkan ke /verify-pin.
 */
export default async function SetupPinPage() {
  const session = await verifySession();
  const user = session.user;

  if (!user.requiresPinVerification) redirect('/');
  if (user.hasPin) redirect('/verify-pin');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Buat PIN</h1>
          <p className="text-sm text-gray-500 mt-1">
            Buat PIN 6 digit untuk mengamankan sesi & otorisasi aksi kasir.
          </p>
          <SetupPinForm />
        </div>
      </div>
    </div>
  );
}
