"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  History,
  Clock,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { useLogout } from "@/features/auth/hooks";
import { getInitials } from "@/lib/format";
import { InstallButton } from "@/features/pwa/InstallButton";

const NAV_ITEMS = [
  { href: "/pos", label: "Cashier", icon: ShoppingCart, exact: true },
  { href: "/pos/transactions", label: "History", icon: History, exact: false },
  { href: "/pos/shift", label: "Shift", icon: Clock, exact: false },
];

/**
 * Sidebar navigasi POS — dipakai statis di desktop (≥lg) dan di dalam drawer
 * pada mobile/tablet (<lg). `onNavigate` dipanggil saat link ditekan agar
 * drawer bisa menutup otomatis.
 */
export function PosSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const { logout } = useLogout();

  const currentOutlet = outlets.find((o) => o.id === user?.currentOutletId);
  const isNavActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex flex-col h-full w-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="px-5 py-6 mb-2">
        <h1 className="text-lg font-bold text-emerald-700">Kasirku</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {currentOutlet?.name ?? "Terminal"}
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isNavActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97]
                ${
                  active
                    ? "bg-emerald-100 text-emerald-800 font-semibold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="m-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm shrink-0">
            {getInitials(user?.name ?? "U")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <InstallButton />
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-200 text-gray-600 text-xs font-medium hover:bg-red-100 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </div>
  );
}
