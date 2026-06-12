import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { setMockSession, mockUseSession, resetMockSession } from '@/test/session';
import type { ShiftDetail } from '@/features/shifts/types';

vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'shift-1' }),
  usePathname: () => '/shift/history/shift-1',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/shifts/api', () => ({ getShiftDetail: vi.fn() }));

import { getShiftDetail } from '@/features/shifts/api';
import ShiftDetailPage from './page';

const mockedDetail = getShiftDetail as unknown as ReturnType<typeof vi.fn>;

const DETAIL: ShiftDetail = {
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
  summary: {
    totalTransactions: 1,
    totalSales: '50000',
    totalCashIn: '50000',
    totalCashRefund: '0',
    openingCash: '100000',
    expectedCash: '150000',
    closingCash: '150000',
    cashDifference: '0',
  },
  _count: { transactions: 1 },
  transactions: [
    {
      id: 't1',
      receiptNumber: 'TRX-0007',
      status: 'COMPLETED',
      paymentMethod: 'CASH',
      totalAmount: '50000',
      createdAt: '2026-06-11T04:00:00.000Z',
    },
  ],
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
    outlets: [],
  });
}

describe('ShiftDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDetail.mockResolvedValue(DETAIL);
  });
  afterEach(() => {
    cleanup();
    resetMockSession();
  });

  it('menampilkan rekap kas + daftar transaksi shift', async () => {
    setUser(['shift.manage']);
    render(<ShiftDetailPage />);

    expect(await screen.findByText('Selisih Kas')).toBeInTheDocument();
    expect(screen.getByText('TRX-0007')).toBeInTheDocument();
    // Header transaksi menyebut jumlah.
    expect(screen.getByText(/Transaksi \(1\)/)).toBeInTheDocument();
    expect(mockedDetail).toHaveBeenCalledWith('shift-1');
  });

  it('tombol Cetak Rekap memanggil window.print()', async () => {
    setUser(['shift.manage']);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<ShiftDetailPage />);

    const cetak = await screen.findByRole('button', { name: /cetak rekap/i });
    fireEvent.click(cetak);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('memblokir user tanpa shift.manage (RBAC)', async () => {
    setUser(['shift.own'], 'CASHIER');
    render(<ShiftDetailPage />);

    expect(screen.getByRole('heading', { name: /akses ditolak/i })).toBeInTheDocument();
    expect(mockedDetail).not.toHaveBeenCalled();
  });
});
