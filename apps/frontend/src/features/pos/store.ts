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
            if (item.stock <= 0) return state; // skip jika stok habis
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: Math.min(i.quantity + 1, item.stock),
                      stock: item.stock,
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      updateQuantity: (productId, variantId, delta) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: Math.min(Math.max(i.quantity + delta, 1), i.stock) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
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
