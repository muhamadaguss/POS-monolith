'use client';

import { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { useCartStore } from '../store';
import { CartPanel } from './CartPanel';
import { IDR } from '@/lib/format';

interface MobileCartProps {
  subtotal: number;
  tax: number;
  taxRate: number;
  grandTotal: number;
  onCheckout: () => void;
  isCheckoutPending: boolean;
}

/**
 * Keranjang versi mobile/tablet (<lg): bar ringkas menempel di bawah +
 * bottom sheet saat ditekan. Di desktop (≥lg) komponen ini disembunyikan dan
 * CartPanel statis di kanan yang dipakai.
 */
export function MobileCart({
  subtotal,
  tax,
  taxRate,
  grandTotal,
  onCheckout,
  isCheckoutPending,
}: MobileCartProps) {
  const [open, setOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      {/* Bar bawah — hanya muncul bila ada item */}
      {totalItems > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 px-3 pb-3 pt-2 bg-gradient-to-t from-gray-50 dark:from-gray-900 via-gray-50 dark:via-gray-900 to-transparent">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 shadow-lg active:scale-[0.99] transition-all"
          >
            <div className="relative shrink-0">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-white text-emerald-700 text-xs font-bold flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs text-emerald-100 leading-none">Total</p>
              <p className="text-base font-bold leading-tight tabular-nums">
                {IDR.format(grandTotal)}
              </p>
            </div>
            <span className="text-sm font-semibold shrink-0">Lihat Keranjang</span>
          </button>
        </div>
      )}

      {/* Bottom sheet */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 h-[88vh] rounded-t-2xl bg-white dark:bg-gray-800 overflow-hidden shadow-xl animate-in slide-in-from-bottom duration-200 flex flex-col">
            {/* Tombol tutup mengambang */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup keranjang"
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <CartPanel
              subtotal={subtotal}
              tax={tax}
              taxRate={taxRate}
              grandTotal={grandTotal}
              onCheckout={() => {
                setOpen(false);
                onCheckout();
              }}
              isCheckoutPending={isCheckoutPending}
            />
          </div>
        </div>
      )}
    </>
  );
}
