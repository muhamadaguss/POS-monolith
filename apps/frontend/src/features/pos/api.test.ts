import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock instance axios bersama (@/lib/api). fetchCashierDailyStats memanggil
// fetchTransactions yang memakai api.get — kita kendalikan respons per halaman.
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '@/lib/api';
import { fetchCashierDailyStats, fetchOutletTaxRate, fetchActiveShift } from './api';
import type { Transaction } from './types';

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

function txn(status: Transaction['status'], total: number): Transaction {
  return { id: `t-${Math.random()}`, status, totalAmount: total } as Transaction;
}

function page(items: Transaction[], totalPages: number) {
  return { data: { items, meta: { totalPages } } };
}

describe('fetchCashierDailyStats', () => {
  beforeEach(() => mockedGet.mockReset());

  it('satu halaman: menghitung jumlah & omzet transaksi COMPLETED saja', async () => {
    mockedGet.mockResolvedValueOnce(
      page([txn('COMPLETED', 10000), txn('COMPLETED', 5000), txn('VOIDED', 9999)], 1),
    );

    const stats = await fetchCashierDailyStats('o1');

    expect(stats.totalTransactions).toBe(2); // VOIDED tak dihitung
    expect(stats.totalRevenue).toBe(15000); // 9999 (VOIDED) tak masuk
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('banyak halaman: mengambil & menggabungkan SEMUA halaman', async () => {
    mockedGet
      .mockResolvedValueOnce(page([txn('COMPLETED', 10000)], 3)) // halaman 1 → totalPages 3
      .mockResolvedValueOnce(page([txn('COMPLETED', 20000)], 3)) // halaman 2
      .mockResolvedValueOnce(page([txn('COMPLETED', 30000), txn('REFUNDED', 1)], 3)); // halaman 3

    const stats = await fetchCashierDailyStats('o1');

    expect(mockedGet).toHaveBeenCalledTimes(3); // 1 awal + 2 sisa
    expect(stats.totalTransactions).toBe(3); // REFUNDED tak dihitung
    expect(stats.totalRevenue).toBe(60000);
  });

  it('mengoersi totalAmount Decimal-string ke number saat menjumlah', async () => {
    mockedGet.mockResolvedValueOnce(
      page([txn('COMPLETED', '12000' as unknown as number), txn('COMPLETED', '3000' as unknown as number)], 1),
    );

    const stats = await fetchCashierDailyStats('o1');
    expect(stats.totalRevenue).toBe(15000); // bukan "120003000"
  });
});

describe('fetchOutletTaxRate', () => {
  beforeEach(() => mockedGet.mockReset());

  it('mengembalikan taxRate sebagai number', async () => {
    mockedGet.mockResolvedValueOnce({ data: { taxRate: '0.11' } });
    expect(await fetchOutletTaxRate('o1')).toBe(0.11);
  });

  it('default 0 bila request gagal (tidak melempar)', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));
    expect(await fetchOutletTaxRate('o1')).toBe(0);
  });
});

describe('fetchActiveShift', () => {
  beforeEach(() => mockedGet.mockReset());

  it('null bila tidak ada shift aktif (404 → tidak melempar)', async () => {
    mockedGet.mockRejectedValueOnce(new Error('404'));
    expect(await fetchActiveShift('o1')).toBeNull();
  });
});
