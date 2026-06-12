import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { setMockSession, mockUseSession, resetMockSession } from '@/test/session';
import type { ShiftListResponse, ShiftStats } from '@/features/shifts/types';

vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/shift/history',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/swal', () => ({ toastSuccess: vi.fn(), errorAlert: vi.fn() }));

vi.mock('@/features/shifts/api', () => ({
  getShifts: vi.fn(),
  getShiftStats: vi.fn(),
  exportShifts: vi.fn(),
}));

import { getShifts, getShiftStats, exportShifts } from '@/features/shifts/api';
import ShiftHistoryPage from './page';

const mockedGetShifts = getShifts as unknown as ReturnType<typeof vi.fn>;
const mockedGetStats = getShiftStats as unknown as ReturnType<typeof vi.fn>;
const mockedExport = exportShifts as unknown as ReturnType<typeof vi.fn>;

function listResponse(overrides?: Partial<ShiftListResponse>): ShiftListResponse {
  return {
    items: [
      {
        id: 'shift-1',
        outletId: 'o1',
        outlet: { id: 'o1', name: 'Cabang Jakarta Pusat' },
        openedById: 'u1',
        openedBy: { id: 'u1', name: 'Andi Prasetyo' },
        openingCash: '100000',
        closingCash: '150000',
        expectedCash: '150000',
        cashDifference: '0',
        status: 'CLOSED',
        openedAt: '2026-06-11T03:00:00.000Z',
        closedAt: '2026-06-11T07:00:00.000Z',
        _count: { transactions: 5 },
      },
    ],
    meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    ...overrides,
  };
}

const STATS: ShiftStats = {
  totalShifts: 124,
  totalCashDifference: '-50550',
  avgDurationMinutes: 495,
};

function setUser(permissions: string[], role = 'TENANT_OWNER') {
  setMockSession({
    user: {
      id: 'u1',
      name: 'Budi',
      email: 'owner@demotoko.com',
      role,
      tenantId: 't1',
      currentOutletId: null,
      permissions,
    },
    outlets: [{ id: 'o1', name: 'Cabang Jakarta Pusat', role, permissions }],
  });
}

describe('ShiftHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetShifts.mockResolvedValue(listResponse());
    mockedGetStats.mockResolvedValue(STATS);
    mockedExport.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    resetMockSession();
  });

  it('menampilkan kartu statistik (total shift, selisih kas, durasi)', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);

    expect(await screen.findByText('124')).toBeInTheDocument(); // total shift
    expect(screen.getByText('-Rp 50.550')).toBeInTheDocument(); // total selisih
    expect(screen.getByText('8j 15m')).toBeInTheDocument(); // 495 menit = 8j 15m
  });

  it('menampilkan baris shift (outlet, kasir, transaksi, rentang waktu)', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);

    expect(await screen.findByText('Cabang Jakarta Pusat')).toBeInTheDocument();
    expect(screen.getByText('Andi Prasetyo')).toBeInTheDocument();
    expect(screen.getByText(/5 transaksi/)).toBeInTheDocument();
  });

  it('default periode 7 Hari aktif & mengirim startDate/endDate ke API', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);
    await screen.findByText('Cabang Jakarta Pusat');

    const call = mockedGetShifts.mock.calls[0][0];
    expect(call.startDate).toBeTruthy();
    expect(call.endDate).toBeTruthy();
  });

  it('ganti preset 30 Hari memanggil ulang API dengan rentang berbeda', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);
    await screen.findByText('Cabang Jakarta Pusat');
    const firstStart = mockedGetShifts.mock.calls[0][0].startDate;

    fireEvent.click(screen.getByRole('button', { name: '30 Hari' }));

    await waitFor(() => {
      const lastStart = mockedGetShifts.mock.calls.at(-1)![0].startDate;
      expect(lastStart).not.toBe(firstStart);
    });
  });

  it('pencarian (debounce) memanggil getShifts dengan param search', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);
    await screen.findByText('Cabang Jakarta Pusat');

    fireEvent.change(screen.getByLabelText('Cari shift atau kasir'), {
      target: { value: 'Andi' },
    });

    await waitFor(
      () =>
        expect(mockedGetShifts).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'Andi', page: 1 }),
        ),
      { timeout: 1000 },
    );
  });

  it('tombol Export memanggil exportShifts', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);
    await screen.findByText('Cabang Jakarta Pusat');

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => expect(mockedExport).toHaveBeenCalledTimes(1));
  });

  it('empty-state bila tak ada shift', async () => {
    setUser(['shift.manage']);
    mockedGetShifts.mockResolvedValue(
      listResponse({ items: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
    );
    render(<ShiftHistoryPage />);

    expect(await screen.findByText(/belum ada riwayat shift/i)).toBeInTheDocument();
  });

  it('memblokir user tanpa shift.manage (RBAC) — tak panggil API', async () => {
    setUser(['shift.own'], 'CASHIER');
    render(<ShiftHistoryPage />);

    expect(screen.getByRole('heading', { name: /akses ditolak/i })).toBeInTheDocument();
    expect(mockedGetShifts).not.toHaveBeenCalled();
    expect(mockedGetStats).not.toHaveBeenCalled();
  });
});
