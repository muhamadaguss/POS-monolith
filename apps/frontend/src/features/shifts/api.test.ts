import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock instance axios bersama (@/lib/api) — kendalikan respons get.
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import { api } from '@/lib/api';
import { getShifts, getShiftDetail } from './api';
import type { ShiftListResponse, ShiftDetail } from './types';

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

  it('menyusun param outlet/status/page/limit pada query-string', async () => {
    mockedGet.mockResolvedValueOnce({ data: LIST });
    await getShifts({ outletId: 'o1', status: 'CLOSED', page: 2, limit: 20 });

    const url = mockedGet.mock.calls[0][0] as string;
    expect(url.startsWith('/shifts?')).toBe(true);
    expect(url).toContain('outletId=o1');
    expect(url).toContain('status=CLOSED');
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
