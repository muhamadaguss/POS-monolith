'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  BarChart2,
  ScrollText,
  CreditCard,
  LogOut,
  Clock,
  History,
  Store,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { OutletSwitcher } from './OutletSwitcher';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permissions?: string[];
  /** Cocokkan path persis (bukan prefix). Cegah parent menyala saat di sub-rute. */
  exact?: boolean;
}

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Utama',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Kasir (POS)', href: '/pos', icon: ShoppingCart },
      { label: 'Manajemen Shift', href: '/shift', icon: Clock, exact: true },
      {
        label: 'Riwayat Shift',
        href: '/shift/history',
        icon: History,
        permissions: ['shift.manage'],
      },
    ],
  },
  {
    heading: 'Manajemen',
    items: [
      {
        label: 'Outlet',
        href: '/outlets',
        icon: Store,
        permissions: ['outlet.manage'],
      },
      {
        label: 'Katalog Produk',
        href: '/products',
        icon: Package,
        permissions: ['product.manage'],
      },
      {
        label: 'Inventaris',
        href: '/inventory',
        icon: Boxes,
        permissions: ['inventory.view_local', 'inventory.view_all'],
      },
      {
        label: 'Karyawan',
        href: '/users',
        icon: Users,
        permissions: ['staff.view_local', 'staff.manage_local', 'staff.manage_global'],
      },
    ],
  },
  {
    heading: 'Laporan',
    items: [
      {
        label: 'Laporan Penjualan',
        href: '/reports',
        icon: BarChart2,
        permissions: ['report.view'],
      },
      {
        label: 'Audit Log',
        href: '/audit-log',
        icon: ScrollText,
        permissions: ['report.view'],
      },
    ],
  },
  {
    heading: 'Akun',
    items: [
      {
        label: 'Billing & Paket',
        href: '/billing',
        icon: CreditCard,
        permissions: ['billing.manage'],
      },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();

  function canAccess(item: NavItem) {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((p) => user?.permissions.includes(p));
  }

  return (
    <aside className="flex flex-col w-64 h-full bg-white border-r border-gray-200 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 shrink-0">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        <span className="font-bold text-gray-900 text-lg">Kasirku</span>
      </div>

      {/* Outlet Switcher — tampil untuk Kasir dan Manager multi-outlet */}
      {(user?.role === 'CASHIER' || user?.role === 'STORE_MANAGER') && (
        <>
          <Separator />
          <div className="px-3 py-3">
            <OutletSwitcher />
          </div>
        </>
      )}

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter(canAccess);
          if (visible.length === 0) return null;

          return (
            <div key={group.heading}>
              <p className="px-3 mb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const isActive =
                    item.href === '/dashboard' || item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <Separator />

      {/* User info + Logout */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 shrink-0">
            <span className="text-xs font-semibold text-gray-600">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-1 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
