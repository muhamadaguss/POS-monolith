import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api';
import { getHourlySales, getSalesByCategory } from './api';

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

describe('getHourlySales', () => {
  beforeEach(() => mockedGet.mockReset());

  it('memetakan respons hourly (Decimal string → number)', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        hourly: [
          { hour: 9, count: 2, revenue: '15000' },
          { hour: 14, count: 1, revenue: '8000' },
        ],
      },
    });

    const res = await getHourlySales('WEEK');

    expect(res).toHaveLength(2);
    expect(res[0]).toEqual({ hour: 9, count: 2, revenue: 15000 });
    expect(res[1].revenue).toBe(8000);
    // URL memuat endpoint & rentang.
    const url = mockedGet.mock.calls[0][0] as string;
    expect(url.startsWith('/reports/hourly?')).toBe(true);
    expect(url).toContain('startDate=');
  });

  it('mengirim outletId bila ada', async () => {
    mockedGet.mockResolvedValueOnce({ data: { hourly: [] } });
    await getHourlySales('WEEK', 'outlet-1');
    expect(mockedGet.mock.calls[0][0]).toContain('outletId=outlet-1');
  });

  it('respons kosong → array kosong (tak error)', async () => {
    mockedGet.mockResolvedValueOnce({ data: {} });
    expect(await getHourlySales('WEEK')).toEqual([]);
  });
});

describe('getSalesByCategory', () => {
  beforeEach(() => mockedGet.mockReset());

  it('memetakan kategori (qty/revenue → number)', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        categories: [
          { categoryId: 'c2', categoryName: 'Makanan', quantity: '3', revenue: '30000' },
          { categoryId: null, categoryName: 'Tanpa Kategori', quantity: '1', revenue: '7000' },
        ],
      },
    });

    const res = await getSalesByCategory('MONTH');

    expect(res[0]).toEqual({
      categoryId: 'c2',
      categoryName: 'Makanan',
      quantity: 3,
      revenue: 30000,
    });
    expect(res[1].categoryId).toBeNull();
    expect(mockedGet.mock.calls[0][0]).toContain('/reports/by-category?');
  });

  it('respons kosong → array kosong', async () => {
    mockedGet.mockResolvedValueOnce({ data: {} });
    expect(await getSalesByCategory('WEEK')).toEqual([]);
  });
});
