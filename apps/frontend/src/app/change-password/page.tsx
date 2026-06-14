import { verifySession } from '@/lib/session';
import { ChangePasswordForm } from './ChangePasswordForm';

/**
 * Halaman ganti password — TOP-LEVEL (di luar group (auth)/(dashboard)/(pos))
 * agar reachable semua role tanpa kena gating layout, termasuk saat alur
 * force-change (mustChangePassword). Server Component tipis: verifikasi sesi
 * lalu render form klien.
 */
export default async function ChangePasswordPage() {
  const session = await verifySession();
  const mustChange = session.user.mustChangePassword ?? false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900">Ganti Password</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mustChange
              ? 'Demi keamanan, Anda wajib mengganti password sebelum melanjutkan.'
              : 'Perbarui password akun Anda.'}
          </p>
          <ChangePasswordForm
            role={session.user.role}
            currentOutletId={session.user.currentOutletId}
            forced={mustChange}
          />
        </div>
      </div>
    </div>
  );
}
