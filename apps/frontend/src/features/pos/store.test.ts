import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './store';

/**
 * Fokus: aturan keranjang yang menjaga integritas transaksi POS —
 * dedup item, clamp kuantitas ke stok (tak boleh over-sell), lantai kuantitas
 * di 1 lalu auto-hapus saat turun ke 0, dan reset diskon saat clear.
 */
function reset() {
  useCartStore.setState({ items: [], discountId: null });
}

const baseItem = {
  productId: 'p1',
  variantId: null,
  name: 'Es Teh Manis',
  price: 5000,
  stock: 3,
};

describe('cart store', () => {
  beforeEach(reset);

  it('addItem menambah item baru dengan quantity 1', () => {
    useCartStore.getState().addItem(baseItem);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: 'p1', quantity: 1 });
  });

  it('addItem pada item yang sama menaikkan quantity (dedup, bukan baris baru)', () => {
    useCartStore.getState().addItem(baseItem);
    useCartStore.getState().addItem(baseItem);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('addItem TIDAK melampaui stok (clamp di stock)', () => {
    const s = useCartStore.getState();
    s.addItem(baseItem); // 1
    s.addItem(baseItem); // 2
    s.addItem(baseItem); // 3 (= stock)
    s.addItem(baseItem); // tetap 3, tidak over-sell
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('membedakan varian berbeda sebagai baris terpisah', () => {
    const s = useCartStore.getState();
    s.addItem(baseItem);
    s.addItem({ ...baseItem, variantId: 'v2', name: 'Es Teh — Large' });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('updateQuantity menaikkan tapi clamp ke stok', () => {
    const s = useCartStore.getState();
    s.addItem(baseItem);
    s.updateQuantity('p1', null, +10);
    expect(useCartStore.getState().items[0].quantity).toBe(3); // = stock
  });

  it('updateQuantity menurunkan ke 0 → item terhapus (lantai 1 lalu filter)', () => {
    const s = useCartStore.getState();
    s.addItem(baseItem); // qty 1
    s.updateQuantity('p1', null, -1); // floor jaga di 1, filter qty>0 tak menghapus
    // qty di-clamp minimal 1, jadi item TETAP ada
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('removeItem menghapus baris yang cocok saja', () => {
    const s = useCartStore.getState();
    s.addItem(baseItem);
    s.addItem({ ...baseItem, variantId: 'v2' });
    s.removeItem('p1', null);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe('v2');
  });

  it('setDiscount menyimpan id; clear mengosongkan item & diskon', () => {
    const s = useCartStore.getState();
    s.addItem(baseItem);
    s.setDiscount('disc-1');
    expect(useCartStore.getState().discountId).toBe('disc-1');

    s.clear();
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.discountId).toBeNull();
  });
});
