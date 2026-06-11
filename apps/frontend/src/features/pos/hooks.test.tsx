import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCheckout, usePosData } from './hooks';
import { useCartStore } from './store';
import { useAuthStore } from '@/features/auth/store';
import type { ReceiptData } from './types';

// Mock layer API & alert agar hook tidak menyentuh jaringan / SweetAlert nyata.
vi.mock('./api', () => ({
  checkout: vi.fn(),
  fetchOutletTaxRate: vi.fn(),
  fetchCategories: vi.fn(),
  fetchProducts: vi.fn(),
  fetchActiveShift: vi.fn(),
}));
vi.mock('@/lib/swal', () => ({
  toastSuccess: vi.fn(),
  errorAlert: vi.fn(),
}));
// usePageFocus memanggil proactiveRefresh — stub agar tak menyentuh jaringan.
vi.mock('@/lib/api', () => ({ proactiveRefresh: vi.fn().mockResolvedValue(undefined) }));

import {
  checkout,
  fetchOutletTaxRate,
  fetchCategories,
  fetchProducts,
  fetchActiveShift,
} from './api';
import { toastSuccess, errorAlert } from '@/lib/swal';

const mockedCheckout = checkout as unknown as ReturnType<typeof vi.fn>;
const mockedTaxRate = fetchOutletTaxRate as unknown as ReturnType<typeof vi.fn>;
const mockedCats = fetchCategories as unknown as ReturnType<typeof vi.fn>;
const mockedProds = fetchProducts as unknown as ReturnType<typeof vi.fn>;
const mockedShift = fetchActiveShift as unknown as ReturnType<typeof vi.fn>;

const receipt = { id: 'trx-1', receiptNumber: 'INV-1' } as ReceiptData;

function seedCart() {
  useCartStore.setState({
    items: [
      { productId: 'p1', variantId: null, name: 'Es Teh', price: 5000, quantity: 2, stock: 10 },
      { productId: 'p2', variantId: null, name: 'Kopi', price: 10000, quantity: 1, stock: 10 },
    ],
    discountId: null,
  });
}

describe('useCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTaxRate.mockResolvedValue(0.1); // 10%
    useAuthStore.setState({
      accessToken: 'a', refreshToken: 'r', outlets: [],
      user: {
        id: 'u1', name: 'Kasir', email: 'k@b.c', role: 'CASHIER',
        tenantId: 't1', currentOutletId: 'o1', permissions: ['pos.transaction'],
      },
    });
    useCartStore.setState({ items: [], discountId: null });
  });
  afterEach(() => useCartStore.setState({ items: [], discountId: null }));

  it('menghitung subtotal, pajak (dibulatkan), & grand total dari isi keranjang', async () => {
    seedCart(); // 2*5000 + 1*10000 = 20000
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.taxRate).toBe(0.1));

    expect(result.current.subtotal).toBe(20000);
    expect(result.current.tax).toBe(2000); // round(20000 * 0.1)
    expect(result.current.grandTotal).toBe(22000);
  });

  it('processPayment sukses: simpan lastReceipt, kosongkan keranjang, tutup dialog, toast', async () => {
    seedCart();
    mockedCheckout.mockResolvedValue(receipt);
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.taxRate).toBe(0.1));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.processPayment('CASH', 50000, 'shift-1');
    });

    expect(ok).toBe(true);
    expect(mockedCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ outletId: 'o1', paymentMethod: 'CASH', amountPaid: 50000 }),
    );
    expect(result.current.lastReceipt).toEqual(receipt); // struk siap dicetak
    expect(useCartStore.getState().items).toHaveLength(0); // keranjang dikosongkan
    expect(result.current.isOpen).toBe(false);
    expect(toastSuccess).toHaveBeenCalledWith('Transaksi berhasil');
  });

  it('amountPaid default ke grandTotal bila cashReceived undefined (non-tunai)', async () => {
    seedCart();
    mockedCheckout.mockResolvedValue(receipt);
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.taxRate).toBe(0.1));

    await act(async () => {
      await result.current.processPayment('QRIS', undefined, 'shift-1');
    });

    expect(mockedCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaid: 22000 }), // = grandTotal
    );
  });

  it('processPayment gagal: set error, errorAlert, keranjang TIDAK dikosongkan', async () => {
    seedCart();
    mockedCheckout.mockRejectedValue({ response: { data: { message: 'Stok tidak cukup' } } });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.taxRate).toBe(0.1));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.processPayment('CASH', 50000, 'shift-1');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Stok tidak cukup');
    expect(errorAlert).toHaveBeenCalledWith('Stok tidak cukup', 'Transaksi Gagal');
    // Keranjang dipertahankan agar kasir bisa coba lagi tanpa kehilangan item.
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(result.current.lastReceipt).toBeNull();
  });

  it('clearReceipt mengosongkan lastReceipt', async () => {
    seedCart();
    mockedCheckout.mockResolvedValue(receipt);
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.taxRate).toBe(0.1));

    await act(async () => {
      await result.current.processPayment('CASH', 50000, 'shift-1');
    });
    expect(result.current.lastReceipt).toEqual(receipt);

    act(() => result.current.clearReceipt());
    expect(result.current.lastReceipt).toBeNull();
  });
});

/**
 * Fokus: regresi "loading stuck setelah sleep, harus refresh manual".
 * - isLoading turun ke false setelah load selesai.
 * - WATCHDOG memaksa isLoading=false bila load menggantung (request beku).
 * - Tab kembali aktif (visibilitychange) memicu reload otomatis.
 */
describe('usePosData', () => {
  function setOutlet(id: string | null) {
    useAuthStore.setState({
      accessToken: 'a', refreshToken: 'r', outlets: [],
      user: id
        ? { id: 'u1', name: 'Kasir', email: 'k@b.c', role: 'CASHIER', tenantId: 't1', currentOutletId: id, permissions: [] }
        : null,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedCats.mockResolvedValue([]);
    mockedProds.mockResolvedValue([]);
    mockedShift.mockResolvedValue(null);
    setOutlet('o1');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });
  afterEach(() => vi.useRealTimers());

  it('isLoading menjadi false setelah katalog & shift selesai dimuat', async () => {
    const { result } = renderHook(() => usePosData());
    expect(result.current.isLoading).toBe(true); // awal: memuat
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedCats).toHaveBeenCalledWith('o1');
  });

  it('tanpa outletId: tidak memuat & isLoading langsung false (tak menggantung)', async () => {
    setOutlet(null);
    const { result } = renderHook(() => usePosData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedCats).not.toHaveBeenCalled();
  });

  it('WATCHDOG: load menggantung → isLoading dipaksa false setelah 15s', async () => {
    vi.useFakeTimers();
    // fetchCategories tak pernah resolve → simulasi request beku pasca-sleep.
    mockedCats.mockReturnValue(new Promise(() => {}));
    mockedProds.mockReturnValue(new Promise(() => {}));
    mockedShift.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePosData());
    expect(result.current.isLoading).toBe(true);

    await act(async () => { vi.advanceTimersByTime(15_000); }); // lewati watchdog
    expect(result.current.isLoading).toBe(false); // tidak stuck walau load beku
  });

  it('tab kembali aktif (visibilitychange) memicu reload katalog otomatis', async () => {
    const { result } = renderHook(() => usePosData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedCats).toHaveBeenCalledTimes(1);

    // usePageFocus mendebounce 150ms sebelum memanggil callback.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((r) => setTimeout(r, 200));
    });

    expect(mockedCats).toHaveBeenCalledTimes(2); // dimuat ulang otomatis
  });
});
