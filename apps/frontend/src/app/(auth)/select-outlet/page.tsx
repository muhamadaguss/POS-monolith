'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ShieldCheck, LogOut, HelpCircle, Bell, RefreshCw, StoreIcon } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import { useSelectOutlet, useLogout } from '@/features/auth/hooks';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_OWNER: 'Pemilik',
  STORE_MANAGER: 'Manajer',
  CASHIER: 'Kasir',
};


export default function SelectOutletPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const { selectOutlet, isPending } = useSelectOutlet();
  const { logout } = useLogout();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    // Owner BOLEH memilih outlet (mis. untuk masuk POS cabang tertentu). Hanya
    // tendang bila benar-benar tidak punya outlet untuk dipilih.
    if (outlets.length === 0) { router.replace('/login'); }
  }, [user, outlets, router]);

  async function handleSelect(outletId: string) {
    setSelectingId(outletId);
    // Hormati ?redirect= bila ada (mis. user datang dari menu POS).
    const redirectTo =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect') ?? undefined
        : undefined;
    await selectOutlet(outletId, redirectTo);
    setSelectingId(null);
  }

  if (!user || outlets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f2]">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <div className="min-h-screen bg-[#f0f4f2] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-emerald-600 text-lg tracking-tight">Kasirku</span>
          </div>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Beranda</span>
            <span>›</span>
            <span className="text-gray-700 font-medium">Pilih Cabang</span>
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button type="button" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button type="button" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-8 py-10 max-w-[1200px] mx-auto w-full">

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pilih Cabang</h1>
          <p className="text-gray-500 text-base max-w-lg">
            Selamat datang kembali, <span className="font-medium text-gray-700">{roleLabel}</span>. Silakan pilih terminal cabang untuk memulai sesi transaksi Anda hari ini.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          {outlets.map((outlet) => {
            const isLoading = isPending && selectingId === outlet.id;
            const outletRole = ROLE_LABEL[outlet.role] ?? outlet.role;
            const statusLabel = 'Aktif';
            const isActive = true;

            return (
              <div
                key={outlet.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4 shadow-sm"
              >
                {/* Top row: icon + badge */}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {statusLabel}
                  </span>
                </div>

                {/* Name + role */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{outlet.name}</h2>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span>Role: {outletRole}</span>
                  </div>
                </div>

                {/* Separator */}
                <hr className="border-gray-200" />

                {/* Footer: ID Terminal + button */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">ID Terminal</p>
                    <p className="text-sm font-mono font-semibold text-gray-600 mt-0.5">
                      TRM-{outlet.id.slice(0, 6).toUpperCase()}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSelect(outlet.id)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {isLoading ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Masuk</>
                    ) : (
                      <>Masuk <span className="text-base leading-none">→</span></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Tambah Cabang placeholder */}
          <div className="bg-transparent rounded-2xl border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]">
            <div className="w-12 h-12 flex items-center justify-center text-gray-300">
              <StoreIcon className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-500">Tambah Cabang</p>
              <p className="text-sm text-gray-400 mt-1 max-w-[180px]">Hubungi Admin Pusat untuk menambahkan lisensi cabang baru.</p>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="px-8 py-4 flex items-center justify-between border-t border-gray-200 bg-white/50">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Server Status: Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Update: baru saja</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Kasirku — Platform POS untuk UMKM &amp; Retail</p>
      </footer>

    </div>
  );
}
