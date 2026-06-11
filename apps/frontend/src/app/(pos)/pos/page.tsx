"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// PosSidebar memuat navigasi (Cashier/History/Shift) + logout — dipakai statis
// di desktop dan via drawer di mobile/tablet agar menu tidak hilang di layar kecil.
import {
  Search,
  RefreshCw,
  Bell,
  Menu,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/features/pos/store";
import { usePosData, useCheckout } from "@/features/pos/hooks";
import { ProductCard } from "@/features/pos/components/ProductCard";
import { CartPanel } from "@/features/pos/components/CartPanel";
import { MobileCart } from "@/features/pos/components/MobileCart";
import { PosSidebar } from "@/features/pos/components/PosSidebar";
import { CheckoutDialog } from "@/features/pos/components/CheckoutDialog";
import { ReceiptDialog } from "@/features/pos/components/ReceiptDialog";
import { confirmDialog } from "@/lib/swal";
import type { Product } from "@/features/pos/types";

export default function PosPage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const {
    categories,
    products,
    activeCategory,
    setActiveCategory,
    search,
    handleSearch,
    activeShift,
    isLoading,
    reload,
  } = usePosData();

  const {
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
    clearReceipt,
  } = useCheckout();

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  function handleAddProduct(product: Product) {
    addItem({
      productId: product.id,
      variantId: null,
      name: product.name,
      price: product.price,
      stock: product.stock,
    });
  }

  async function handleCheckoutOpen() {
    // Tanpa shift aktif, transaksi tidak bisa diproses. Beri arahan jelas
    // (bukan diam) — tawarkan langsung membuka shift.
    if (!activeShift) {
      const go = await confirmDialog({
        title: "Belum ada shift aktif",
        text: "Buka shift kasir terlebih dahulu sebelum memproses pembayaran.",
        confirmText: "Buka Shift",
        cancelText: "Nanti",
      });
      if (go) router.push("/pos/shift");
      return;
    }
    setIsOpen(true);
  }

  async function handleConfirmPayment(
    method:
      | "CASH"
      | "DEBIT_CARD"
      | "CREDIT_CARD"
      | "QRIS"
      | "TRANSFER"
      | "OTHER",
    cashReceived?: number,
  ) {
    if (!activeShift) return;
    const success = await processPayment(method, cashReceived, activeShift.id);
    if (success) reload();
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* ================================================================
          SIDEBAR KIRI — navigasi utama (statis, desktop ≥lg)
      ================================================================ */}
      <aside className="hidden lg:flex w-55 shrink-0 h-full">
        <PosSidebar />
      </aside>

      {/* Drawer + overlay — mobile/tablet (<lg) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80%] shadow-xl animate-in slide-in-from-left duration-200">
            <PosSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ================================================================
          AREA UTAMA — produk
      ================================================================ */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2 px-3 md:px-5 h-16 bg-white border-b border-gray-200 shadow-sm shrink-0 z-10">
          {/* Hamburger — mobile/tablet saja */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari produk atau scan barcode..."
                className="pl-9 h-10 rounded-full bg-gray-100 border-none focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={reload}
              title="Muat ulang katalog"
              className="p-2 rounded-full hover:bg-gray-100 text-emerald-700 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Right: store name, date, notif */}
          <div className="flex items-center gap-3">
            {/* No-shift warning */}
            {!activeShift && !isLoading && (
              <div className="hidden md:flex items-center gap-1.5 text-amber-600 text-xs font-medium bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Tidak ada shift aktif
              </div>
            )}

            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-900">
                Kasirku
              </span>
              <span className="text-xs text-gray-400">{today}</span>
            </div>

            <div className="w-px h-8 bg-gray-200 mx-1" />

            <button
              type="button"
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title="Notifikasi"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Category pills */}
        <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-gray-100 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95
              ${
                activeCategory === "ALL"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95
                ${
                  activeCategory === cat.id
                    ? "text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              style={
                activeCategory === cat.id
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Peringatan no-shift — mobile (header warning hidden < md) */}
        {!activeShift && !isLoading && (
          <Link
            href="/pos/shift"
            className="md:hidden flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs font-medium shrink-0"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">Tidak ada shift aktif — buka shift untuk transaksi</span>
            <span className="font-semibold underline">Buka Shift</span>
          </Link>
        )}

        {/* Product grid */}
        <ScrollArea className="flex-1">
          {/* pb ekstra di mobile agar baris terakhir tak tertutup bar keranjang */}
          <div className="p-5 pb-28 lg:pb-5">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-3/4 rounded-xl bg-gray-200 animate-pulse"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">
                  Produk tidak ditemukan
                </p>
                {search && (
                  <p className="text-xs text-gray-300 mt-1">
                    Coba kata kunci lain atau scan ulang barcode
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={handleAddProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* ================================================================
          CART SIDEBAR — kanan (statis, desktop ≥lg)
      ================================================================ */}
      <aside className="hidden lg:block w-75 xl:w-[320px] shrink-0 h-full border-l border-gray-200 z-20">
        <CartPanel
          subtotal={subtotal}
          tax={tax}
          taxRate={taxRate}
          grandTotal={grandTotal}
          onCheckout={handleCheckoutOpen}
          isCheckoutPending={isPending}
        />
      </aside>

      {/* ================================================================
          CART MOBILE — bar bawah + bottom sheet (<lg)
      ================================================================ */}
      <MobileCart
        subtotal={subtotal}
        tax={tax}
        taxRate={taxRate}
        grandTotal={grandTotal}
        onCheckout={handleCheckoutOpen}
        isCheckoutPending={isPending}
      />

      {/* Checkout dialog */}
      <CheckoutDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        grandTotal={grandTotal}
        isPending={isPending}
        error={error}
        onConfirm={handleConfirmPayment}
      />

      {/* Struk muncul otomatis setelah transaksi berhasil */}
      <ReceiptDialog
        open={lastReceipt !== null}
        onOpenChange={(open) => {
          if (!open) clearReceipt();
        }}
        data={lastReceipt}
      />
    </div>
  );
}
