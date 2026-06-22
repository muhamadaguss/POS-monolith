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
  KeyRound,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { OutletSwitcher } from './OutletSwitcher';
import { InstallButton } from '@/features/pwa/InstallButton';
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
        label: 'Transfer Stok',
        href: '/transfers',
        icon: ArrowLeftRight,
        permissions: ['inventory.transfer'],
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

export function Sidebar({
  onNavigate,
  collapsed = false,
  dark = false,
  onToggleCollapse,
  onToggleDark,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  dark?: boolean;
  onToggleCollapse?: () => void;
  onToggleDark?: () => void;
} = {}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();

  function canAccess(item: NavItem) {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((p) => user?.permissions.includes(p));
  }

  return (
    <aside
      className={`flex flex-col h-full shrink-0 transition-all duration-300 bg-white/95 backdrop-blur-lg border-r border-gray-100 dark:bg-gray-900/95 dark:border-gray-800 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center px-2' : 'px-5'} py-5`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 shrink-0 transition-all duration-300 hover:scale-105 hover:shadow-md">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">Kasirku</span>
        )}
      </div>

      {/* Outlet Switcher */}
      {(user?.role === 'CASHIER' || user?.role === 'STORE_MANAGER') && !collapsed && (
        <>
          <Separator className="dark:border-gray-800" />
          <div className="px-3 py-3">
            <OutletSwitcher />
          </div>
        </>
      )}

      <Separator className="dark:border-gray-800" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter(canAccess);
          if (visible.length === 0) return null;

          return (
            <div key={group.heading}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-l-2 border-emerald-400 pl-3">
                  {group.heading}
                </p>
              )}
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
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                          collapsed ? 'justify-center' : ''
                        } ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-900/30 dark:to-transparent text-emerald-700 dark:text-emerald-400 shadow-sm border-r-2 border-emerald-500'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 hover:translate-x-0.5'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive
                              ? 'text-emerald-600 dark:text-emerald-400 drop-shadow-sm'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        />
                        {!collapsed && item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <Separator className="dark:border-gray-800" />

      {/* Bottom: User info + Actions */}
      <div className={`${collapsed ? 'px-2 py-3' : 'px-3 py-4'} space-y-1`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 transition-all duration-300 hover:ring-2 hover:ring-emerald-200 dark:hover:ring-emerald-600">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        )}

        {collapsed ? (
          <>
            {/* Collapsed: avatar only */}
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {user?.name?.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <InstallButton />
        )}

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDark}
          title={collapsed ? (dark ? 'Mode Terang' : 'Mode Gelap') : undefined}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            collapsed ? 'justify-center' : ''
          } text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200`}
        >
          {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && (dark ? 'Mode Terang' : 'Mode Gelap')}
        </button>

        {/* Change Password */}
        <Link
          href="/change-password"
          title={collapsed ? 'Ganti Password' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            collapsed ? 'justify-center' : ''
          } text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200`}
          onClick={onNavigate}
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          {!collapsed && 'Ganti Password'}
        </Link>

        {/* Collapse Toggle — desktop only */}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Perluas Menu' : 'Ciutkan Menu'}
          className="hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0 mx-auto" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 shrink-0" />
              <span>Ciutkan</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Keluar' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            collapsed ? 'justify-center' : ''
          } text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:shadow-sm`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Keluar'}
        </button>
      </div>
    </aside>
  );
}
