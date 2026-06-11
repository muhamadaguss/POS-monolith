'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useCartStore } from './store';
import {
  fetchCategories,
  fetchProducts,
  fetchActiveShift,
  fetchOutletTaxRate,
  checkout,
} from './api';
import { toastSuccess, errorAlert } from '@/lib/swal';
import type { Category, Product, ActiveShift, ReceiptData, PaymentMethod } from './types';

export function usePosData() {
  const outletId = useAuthStore((s) => s.user?.currentOutletId ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInitial = useCallback(async () => {
    if (!outletId) {
      // Tanpa outlet tak ada yang dimuat — pastikan loading tidak menggantung.
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [cats, prods, shift] = await Promise.all([
        fetchCategories(outletId),
        fetchProducts(outletId),
        fetchActiveShift(outletId),
      ]);
      setCategories(cats);
      setProducts(prods);
      setActiveShift(shift);
    } catch {
      // 401/refresh gagal ditangani interceptor; jangan biarkan jadi unhandled.
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  function handleSearch(value: string) {
    setSearch(value);
    setActiveCategory('ALL');
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (!outletId) return;
      const prods = await fetchProducts(outletId, value || undefined);
      setProducts(prods);
    }, 300);
  }

  const displayedProducts =
    activeCategory === 'ALL'
      ? products
      : products.filter((p) => p.categoryId === activeCategory);

  return {
    categories,
    products: displayedProducts,
    activeCategory,
    setActiveCategory,
    search,
    handleSearch,
    activeShift,
    isLoading,
    reload: loadInitial,
  };
}

export function useCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Struk transaksi terakhir yang berhasil — dipakai membuka ReceiptDialog.
  // Disimpan terpisah dari keranjang (yang sudah di-clear) agar tetap bisa dicetak.
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const user = useAuthStore((s) => s.user);
  const outletId = user?.currentOutletId ?? '';
  const { items, discountId, clear } = useCartStore();

  // Tarif pajak diambil dari konfigurasi outlet aktif (bukan hardcode).
  // Backend tetap sumber kebenaran saat checkout; ini agar tampilan POS cocok.
  const [taxRate, setTaxRate] = useState(0);
  useEffect(() => {
    if (!outletId) return;
    fetchOutletTaxRate(outletId)
      .then(setTaxRate)
      .catch(() => {});
  }, [outletId]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * taxRate);
  const grandTotal = subtotal + tax;

  async function processPayment(
    paymentMethod: PaymentMethod,
    cashReceived: number | undefined,
    _shiftId: string,
  ): Promise<boolean> {
    if (isPending) return false;
    setIsPending(true);
    setError(null);
    try {
      const receipt = await checkout({
        outletId: user?.currentOutletId ?? '',
        items: items.map((i) => ({
          productId: i.productId,
          ...(i.variantId && { variantId: i.variantId }),
          quantity: i.quantity,
        })),
        ...(discountId && { discountId }),
        paymentMethod,
        amountPaid: cashReceived ?? grandTotal,
      });
      clear();
      setIsOpen(false);
      setLastReceipt(receipt); // simpan untuk membuka ReceiptDialog
      toastSuccess('Transaksi berhasil');
      return true;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Transaksi gagal. Coba lagi.';
      setError(msg);
      errorAlert(msg, 'Transaksi Gagal');
      return false;
    } finally {
      setIsPending(false);
    }
  }

  return {
    isOpen,
    setIsOpen,
    isPending,
    error,
    subtotal,
    tax,
    taxRate,
    grandTotal,
    processPayment,
    lastReceipt,
    clearReceipt: () => setLastReceipt(null),
  };
}
