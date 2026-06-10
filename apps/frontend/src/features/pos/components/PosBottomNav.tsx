'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Receipt, Clock } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/pos', label: 'Kasir', icon: ShoppingCart, exact: true },
  { href: '/pos/transactions', label: 'Riwayat', icon: Receipt, exact: false },
  { href: '/pos/shift', label: 'Shift', icon: Clock, exact: false },
];

export function PosBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors
                ${active ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
