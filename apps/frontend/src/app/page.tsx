import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSession } from '@/lib/session';

// Dynamic import untuk client component
const LandingPage = dynamic(() => import('./(landing)/page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-emerald-600 font-medium">Memuat...</div>
    </div>
  ),
});

/**
 * Root page:
 * - User NOT logged in → Landing Page
 * - User logged in → Redirect to dashboard/pos/admin based on role
 */
export default async function RootPage() {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    // Show landing page (dynamic import for client component)
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
