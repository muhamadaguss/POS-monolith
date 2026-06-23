'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/shared/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { useAuthGuard } from '@/features/auth/useAuthGuard';
import { proactiveRefresh } from '@/lib/api';
import '../globals-ui.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user, accessToken, hasRefresh } = useAuthGuard();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  // Boot-refresh di latar belakang, tidak memblokir render.
  useEffect(() => {
    if (!ready) return;
    if (user && hasRefresh) {
      proactiveRefresh().catch(() => { /* redirect ditangani di dalam */ });
    }
  }, [ready, user, hasRefresh]);

  useEffect(() => {
    if (!ready) return;
    if (!accessToken && !user && !hasRefresh) {
      router.replace('/login');
      return;
    }
    if (!user) return;
    if (!user.currentOutletId && user.role !== 'TENANT_OWNER') {
      router.replace('/select-outlet');
      return;
    }
    if (user.role === 'CASHIER') {
      router.replace('/pos');
    }
  }, [ready, accessToken, user, hasRefresh, router]);

  // Dark mode persistence
  useEffect(() => {
    const stored = localStorage.getItem('kasirku-theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('kasirku-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const needsOutlet = user?.role !== 'TENANT_OWNER';
  if (!ready || !user || (needsOutlet && !user.currentOutletId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100/40 dark:from-gray-950 dark:to-gray-900">
      {/* Sidebar statis — desktop saja */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          dark={dark}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          onToggleDark={() => setDark((p) => !p)}
        />
      </div>

      {/* Drawer + overlay — mobile/tablet */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
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
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-100/80 dark:border-gray-800 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800 transition-colors active:scale-95"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 shrink-0">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100">Kasirku</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <TrialBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
