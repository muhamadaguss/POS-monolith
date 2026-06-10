'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/shared/Sidebar';
import { useAuthGuard } from '@/features/auth/useAuthGuard';
import { proactiveRefresh } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user, accessToken, hasRefresh } = useAuthGuard();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Boot-refresh di latar belakang, tidak memblokir render.
  useEffect(() => {
    if (!ready) return;
    if (user && hasRefresh) {
      proactiveRefresh().catch(() => { /* redirect ditangani di dalam */ });
    }
  }, [ready, user, hasRefresh]);

  useEffect(() => {
    if (!ready) return;
    // Hanya lempar ke login bila benar-benar tidak ada sesi yang bisa dipakai.
    if (!accessToken && !user && !hasRefresh) {
      router.replace('/login');
      return;
    }
    if (!user) return;
    // Owner tidak perlu currentOutletId — akses lintas outlet dari dashboard.
    if (!user.currentOutletId && user.role !== 'TENANT_OWNER') {
      router.replace('/select-outlet');
      return;
    }
    if (user.role === 'CASHIER') {
      router.replace('/pos');
    }
  }, [ready, accessToken, user, hasRefresh, router]);

  const needsOutlet = user?.role !== 'TENANT_OWNER';
  if (!ready || !user || (needsOutlet && !user.currentOutletId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar statis — desktop saja */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Drawer + overlay — mobile/tablet */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80%] shadow-xl animate-in slide-in-from-left duration-200">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile — logo + hamburger (lg: disembunyikan) */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 shrink-0">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="font-bold text-gray-900">Kasirku</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
