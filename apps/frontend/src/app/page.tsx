import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { LandingPage } from './(landing)/page';

/**
 * Root page:
 * - User NOT logged in → Landing Page
 * - User logged in → Redirect to dashboard/pos/admin based on role
 */
export default async function RootPage() {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    // Show landing page (render the component from (landing) group)
    return <LandingPage />;
  }

  // User logged in - redirect based on role
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
