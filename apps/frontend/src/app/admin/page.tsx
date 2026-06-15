'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ShieldCheck, Users, Building2, CreditCard, BarChart2, LogOut, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';
import { AdminConsoleHeader } from './_components/AdminConsoleHeader';

const ADMIN_CARDS: {
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  href?: string;
}[] = [
  { icon: Building2, label: 'Manajemen Tenant', desc: 'Kelola tenant, status, dan paket langganan', color: 'text-blue-600 bg-blue-50', href: '/admin/tenants' },
  { icon: Users, label: 'Manajemen User', desc: 'Lihat dan kelola semua user di platform', color: 'text-emerald-600 bg-emerald-50', href: '/admin/users' },
  { icon: CreditCard, label: 'Billing & Paket', desc: 'Monitor pembayaran dan upgrade paket tenant', color: 'text-violet-600 bg-violet-50' },
  { icon: BarChart2, label: 'Laporan Platform', desc: 'Statistik penggunaan dan pendapatan platform', color: 'text-amber-600 bg-amber-50', href: '/admin/reports' },
];

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  // Primitif stabil untuk dependency efek — objek `user`/`accessToken` dibangun
  // ulang tiap render oleh shim, jadi tak boleh jadi dependency (memicu loop).
  const userRole = useAuthStore((s) => s.user?.role ?? null);
  const isLoggedIn = useAuthStore((s) => s.user != null);
  const { data: sessionData } = useSession();
  const { logout } = useLogout();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    if (userRole !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [hydrated, isLoggedIn, userRole, router]);

  if (!hydrated || !user || userRole !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminConsoleHeader
        title="Dashboard"
        adminName={user.name ?? 'Super Admin'}
        loginAt={sessionData?.loginAt}
        extra={
          <div className="flex items-center gap-1">
            <Link
              href="/change-password"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden lg:inline">Ganti Password</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        }
      />

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola seluruh platform Kasirku</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ADMIN_CARDS.map((card) => {
            const Icon = card.icon;
            const active = !!card.href;
            return (
              <div
                key={card.label}
                onClick={() => card.href && router.push(card.href)}
                className={`bg-white rounded-2xl border p-6 flex items-start gap-4 transition-all ${
                  active
                    ? 'border-gray-200 hover:shadow-md hover:border-emerald-300 cursor-pointer'
                    : 'border-gray-200 opacity-70'
                }`}
              >
                <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{card.label}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{card.desc}</p>
                  {active ? (
                    <span className="text-xs font-semibold text-emerald-600 mt-2 inline-block">
                      Buka →
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 mt-2 inline-block">Coming soon</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
          <p className="text-sm font-semibold text-amber-800">Catatan</p>
          <p className="text-sm text-amber-700 mt-1">
            Halaman manajemen platform sedang dalam pengembangan. Gunakan Prisma Studio atau akses langsung ke database untuk operasi admin sementara.
          </p>
        </div>
      </main>
    </div>
  );
}
