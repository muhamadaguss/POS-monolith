import dynamic from 'next/dynamic';
import { LandingPageSkeleton } from '@/app/_components/LandingPage';

// Dynamic import untuk client component (dari _components agar tidak jadi route)
const LandingPage = dynamic(() => import('@/app/_components/LandingPage'), {
  loading: () => <LandingPageSkeleton />,
});

/**
 * Root page — serve landing page IMMEDIATELY for first paint.
 * Auth check happens client-side via SessionProvider (non-blocking).
 * Only redirect logged-in users after initial render.
 */
export default async function RootPage() {
  // Serve landing page immediately for fast FCP
  // Auth-based redirect is handled by SessionProvider on client side
  return <LandingPage />;
}
