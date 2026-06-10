'use client';

import { Minus, Plus, Trash2, ShoppingCart, ShoppingCartIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCartStore } from '../store';
import { IDR } from '@/lib/format';

interface CartPanelProps {
  subtotal: number;
  tax: number;
  taxRate: number;
  grandTotal: number;
  onCheckout: () => void;
  isCheckoutPending: boolean;
}

export function CartPanel({
  subtotal,
  tax,
  taxRate,
  grandTotal,
  onCheckout,
  isCheckoutPending,
}: CartPanelProps) {
  const { items, updateQuantity, removeItem } = useCartStore();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const canCheckout = items.length > 0 && !isCheckoutPending;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-700" />
          <h2 className="text-lg font-semibold text-gray-900">Keranjang</h2>
        </div>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full text-xs font-medium">
          {totalItems} item
        </span>
      </div>

      {/* Item list or empty state */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4 border border-gray-200">
            <ShoppingCartIcon className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Keranjang kosong</h3>
          <p className="text-sm text-gray-400 max-w-[180px] leading-relaxed">
            Pilih produk dari katalog untuk memulai transaksi baru.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <ul className="px-3 py-2 space-y-1">
            {items.map((item) => (
              <li
                key={`${item.productId}-${item.variantId}`}
                className="flex items-start gap-2 rounded-xl px-2 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{IDR.format(item.price)}</p>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                    {IDR.format(item.price * item.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                  <button
                    type="button"
                    aria-label="Kurangi"
                    onClick={() => updateQuantity(item.productId, item.variantId, -1)}
                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3 h-3 text-gray-600" />
                  </button>

                  <span className="w-7 text-center text-sm font-bold text-gray-900 tabular-nums">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    aria-label="Tambah"
                    onClick={() => updateQuantity(item.productId, item.variantId, +1)}
                    disabled={item.quantity >= item.stock}
                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3 text-gray-600" />
                  </button>

                  <button
                    type="button"
                    aria-label="Hapus item"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center ml-0.5 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}

      {/* Summary + checkout */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/50 p-5">
        <div className="space-y-2 mb-5">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="tabular-nums">{IDR.format(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Pajak ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="tabular-nums">{IDR.format(tax)}</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-emerald-700 tabular-nums">{IDR.format(grandTotal)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCheckout}
          disabled={!canCheckout}
          className={`w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all
            ${canCheckout
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.99] shadow-sm'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
            }`}
        >
          {isCheckoutPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              PROSES BAYAR
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
