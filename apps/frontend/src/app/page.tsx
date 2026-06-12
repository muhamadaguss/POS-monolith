import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

/**
 * Entry redirector — Server Component. Membaca session Auth.js (cookie) di server
 * dan mengarahkan sesuai login state & role. Tak ada lagi spinner hydration klien.
 */
export default async function RootPage() {
  const session = await getSession();
  const user = session?.user;

  if (!user) redirect('/login');

  switch (user.role) {
    case 'SUPER_ADMIN':
      redirect('/admin');
    case 'CASHIER':
      redirect('/pos');
    case 'TENANT_OWNER':
      redirect('/dashboard');
    default: // STORE_MANAGER
      redirect(user.currentOutletId ? '/dashboard' : '/select-outlet');
  }
}
