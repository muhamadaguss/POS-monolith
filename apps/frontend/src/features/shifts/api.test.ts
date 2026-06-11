import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock instance axios bersama (@/lib/api) — kendalikan respons get.
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import { api } from '@/lib/api';
import { getShifts, getShiftDetail, getShiftStats, exportShifts } from './api';
import type { ShiftListResponse, ShiftDetail, ShiftStats } from './types';

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

const LIST: ShiftListResponse = {
  items: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
};

describe('getShifts — query-string', () => {
  beforeEach(() => mockedGet.mockReset());

  it('tanpa filter: memanggil /shifts polos (tanpa "?")', async () => {
    mockedGet.mockResolvedValueOnce({ data: LIST });
    await getShifts();
    expect(mockedGet).toHaveBeenCalledWith('/shifts');
  });

  it('menyusun param outlet/status/search/page/limit pada query-string', async () => {
    mockedGet.mockResolvedValueOnce({ data: LIST });
    await getShifts({ outletId: 'o1', status: 'CLOSED', search: 'Andi', page: 2, limit: 20 });

    const url = mockedGet.mock.calls[0][0] as string;
    expect(url.startsWith('/shifts?')).toBe(true);
    expect(url).toContain('outletId=o1');
    expect(url).toContain('status=CLOSED');
    expect(url).toContain('search=Andi');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=20');
  });

  it('mengabaikan field kosong (tidak mengirim param undefined)', async () => {
    mockedGet.mockResolvedValueOnce({ data: LIST });
    await getShifts({ outletId: '', status: undefined, page: 1 });

    const url = mockedGet.mock.calls[0][0] as string;
    expect(url).not.toContain('outletId');
    expect(url).not.toContain('status');
    expect(url).toContain('page=1');
  });

  it('mengembalikan payload (sudah ter-unwrap envelope)', async () => {
    mockedGet.mockResolvedValueOnce({ data: { ...LIST, meta: { ...LIST.meta, total: 3 } } });
    const res = await getShifts();
    expect(res.meta.total).toBe(3);
  });
});

describe('getShiftDetail', () => {
  beforeEach(() => mockedGet.mockReset());

  it('memanggil /shifts/:id dan mengembalikan detail', async () => {
    const detail = { id: 'shift-9', transactions: [] } as unknown as ShiftDetail;
    mockedGet.mockResolvedValueOnce({ data: detail });

    const res = await getShiftDetail('shift-9');

    expect(mockedGet).toHaveBeenCalledWith('/shifts/shift-9');
    expect(res.id).toBe('shift-9');
  });
});

describe('getShiftStats', () => {
  beforeEach(() => mockedGet.mockReset());

  it('memanggil /shifts/stats dengan filter & mengembalikan agregat', async () => {
    const stats: ShiftStats = { totalShifts: 5, totalCashDifference: '-3000', avgDurationMinutes: 90 };
    mockedGet.mockResolvedValueOnce({ data: stats });

    const res = await getShiftStats({ status: 'CLOSED' });

    const url = mockedGet.mock.calls[0][0] as string;
    expect(url.startsWith('/shifts/stats')).toBe(true);
    expect(url).toContain('status=CLOSED');
    expect(res.totalShifts).toBe(5);
    expect(res.avgDurationMinutes).toBe(90);
  });
});

describe('exportShifts', () => {
  beforeEach(() => mockedGet.mockReset());

  it('meminta blob dari /shifts/export & memicu unduhan', async () => {
    // Stub API browser untuk unduhan.
    const createUrl = vi.fn(() => 'blob:mock');
    const revokeUrl = vi.fn();
    (URL as unknown as { createObjectURL: typeof createUrl }).createObjectURL = createUrl;
    (URL as unknown as { revokeObjectURL: typeof revokeUrl }).revokeObjectURL = revokeUrl;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    mockedGet.mockResolvedValueOnce({ data: new Blob(['x']) });

    await exportShifts({ outletId: 'o1' });

    const [url, opts] = mockedGet.mock.calls[0];
    expect((url as string).startsWith('/shifts/export')).toBe(true);
    expect(opts).toEqual({ responseType: 'blob' });
    expect(createUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
