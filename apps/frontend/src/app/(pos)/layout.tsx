'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/features/auth/useAuthGuard';
import { proactiveRefresh } from '@/lib/api';
import TrialBanner from '@/components/TrialBanner';
import '../globals-ui.css';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user, accessToken, hasRefresh } = useAuthGuard();

  useEffect(() => {
    if (!ready) return;
    if (user && hasRefresh) {
      proactiveRefresh().catch(() => { /* redirect ditangani di dalam */ });
    }
  }, [ready, user, hasRefresh]);

  useEffect(() => {
    if (!ready) return;
    if (!accessToken && !user && !hasRefresh) { router.replace('/login'); return; }
    if (!user) return;
    if (!user.currentOutletId) { router.replace('/select-outlet?redirect=/pos'); }
  }, [ready, accessToken, user, hasRefresh, router]);

  if (!ready || !user?.currentOutletId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TrialBanner />
      {children}
    </div>
  );
}
