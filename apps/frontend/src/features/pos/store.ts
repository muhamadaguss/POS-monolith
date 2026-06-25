import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  variantId: string | null;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  discountId: string | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (productId: string, variantId: string | null, delta: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  setDiscount: (discountId: string | null) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      discountId: null,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );
          if (existing) {
            // Pakai item.stock (fresh dari API) sebagai batas maks, bukan
            // i.stock (bisa stale dari localStorage). Update juga stock
            // agar tidak stale untuk penambahan berikutnya.
            if (item.stock <= 0) return {}; // BUG FIX #1: return {} bukan return state (yang menyertakan functions)

            // Jika sudah di maks stok, hanya update stock tanpa nambah qty
            if (existing.quantity >= item.stock) {
              return {
                items: state.items.map((i) =>
                  i.productId === item.productId && i.variantId === item.variantId
                    ? { ...i, stock: item.stock }
                    : i,
                ),
              };
            }

            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: i.quantity + 1,
                      stock: item.stock, // selalu update stock ke nilai fresh dari API
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      updateQuantity: (productId, variantId, delta) =>
        set((state) => {
          const item = state.items.find(
            (i) => i.productId === productId && i.variantId === variantId,
          );
          if (!item) return {};

          const newQty = item.quantity + delta;

          // BUG FIX #2: jika turun ke 0 atau kurang, hapus item (bukan clamp ke 1)
          if (newQty <= 0) {
            return {
              items: state.items.filter(
                (i) => !(i.productId === productId && i.variantId === variantId),
              ),
            };
          }

          // BUG FIX #3: effectiveStock — jika stock stale (0), izinkan kuantitas saat ini
          // agar item tidak tiba-tiba terhapus karena Math.min(qty, 0) = 0
          const effectiveStock = item.stock > 0 ? item.stock : item.quantity;
          return {
            items: state.items.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: Math.min(newQty, effectiveStock) }
                : i,
            ),
          };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        })),
      setDiscount: (discountId) => set({ discountId }),
      clear: () => set({ items: [], discountId: null }),
    }),
    { name: 'kasirku-cart' },
  ),
);
