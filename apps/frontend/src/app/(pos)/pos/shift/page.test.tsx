import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { setMockSession, mockUseSession, resetMockSession } from '@/test/session';
import type { Shift } from '@/features/shifts/types';

vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

// Router & komponen berat di-stub agar test fokus ke alur tutup-shift → rekap.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/pos/shift',
}));
vi.mock('@/features/pos/components/PosSidebar', () => ({ PosSidebar: () => null }));
vi.mock('@/lib/swal', () => ({ toastSuccess: vi.fn(), errorAlert: vi.fn() }));

vi.mock('@/features/shifts/api', () => ({
  getActiveShift: vi.fn(),
  openShift: vi.fn(),
  closeShift: vi.fn(),
}));

import { getActiveShift, closeShift } from '@/features/shifts/api';
import PosShiftPage from './page';

const mockedActive = getActiveShift as unknown as ReturnType<typeof vi.fn>;
const mockedClose = closeShift as unknown as ReturnType<typeof vi.fn>;

const ACTIVE: Shift = {
  id: 'shift-1',
  outletId: 'o1',
  outlet: { id: 'o1', name: 'Cabang Jakarta Pusat' },
  openedById: 'u1',
  openedBy: { id: 'u1', name: 'Andi Prasetyo' },
  openingCash: '10000',
  status: 'OPEN',
  openedAt: '2026-06-11T03:00:00.000Z',
  summary: { totalTransactions: 0, totalSales: '0', totalCash: '0', totalNonCash: '0' },
};

const CLOSED: Shift = {
  ...ACTIVE,
  status: 'CLOSED',
  closingCash: '10000',
  expectedCash: '10000',
  cashDifference: '0',
  closedAt: '2026-06-11T07:00:00.000Z',
  summary: {
    totalTransactions: 0, totalSales: '0', totalCashIn: '0', totalCashRefund: '0',
    openingCash: '10000', expectedCash: '10000', closingCash: '10000', cashDifference: '0',
  },
};

describe('PosShiftPage — alur tutup shift → rekap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockSession({
      user: {
        id: 'u1', name: 'Andi Prasetyo', email: 'kasir@demotoko.com', role: 'CASHIER',
        tenantId: 't1', currentOutletId: 'o1', permissions: ['shift.own'],
      },
      outlets: [],
    });
  });
  afterEach(() => {
    cleanup();
    resetMockSession();
  });

  it('menutup shift menampilkan modal Rekap Shift + tombol Cetak (regresi: dulu langsung ke form buka shift)', async () => {
    mockedActive.mockResolvedValue(ACTIVE);
    mockedClose.mockResolvedValue(CLOSED);

    render(<PosShiftPage />);

    // Shift aktif termuat → tombol "Tutup Shift Sekarang" tampil.
    const tutupBtn = await screen.findByRole('button', { name: /tutup shift sekarang/i });
    fireEvent.click(tutupBtn);

    // Modal input kas fisik muncul.
    const kasInput = await screen.findByPlaceholderText(/hitung uang di laci/i);
    fireEvent.change(kasInput, { target: { value: '10000' } });

    fireEvent.click(screen.getByRole('button', { name: /konfirmasi tutup shift/i }));

    // INTI REGRESI: setelah tutup, modal "Rekap Shift" muncul (bukan form buka shift).
    expect(await screen.findByRole('heading', { name: /rekap shift/i })).toBeInTheDocument();
    // Tombol Cetak ada di modal rekap.
    expect(screen.getByRole('button', { name: /cetak/i })).toBeInTheDocument();
    // Rincian rekap final tampil.
    expect(screen.getByText('Selisih Kas')).toBeInTheDocument();
    expect(closeShift).toHaveBeenCalledWith('shift-1', expect.objectContaining({ closingCash: 10000 }));
  });

  it('klik Selesai pada rekap menutup modal & redirect ke /pos', async () => {
    mockedActive.mockResolvedValue(ACTIVE);
    mockedClose.mockResolvedValue(CLOSED);

    render(<PosShiftPage />);
    fireEvent.click(await screen.findByRole('button', { name: /tutup shift sekarang/i }));
    const kasInput = await screen.findByPlaceholderText(/hitung uang di laci/i);
    fireEvent.change(kasInput, { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: /konfirmasi tutup shift/i }));

    await screen.findByRole('heading', { name: /rekap shift/i });
    fireEvent.click(screen.getByRole('button', { name: /selesai/i }));

    expect(pushMock).toHaveBeenCalledWith('/pos');
  });

  it('tanpa shift aktif: menampilkan form buka shift (bukan rekap)', async () => {
    mockedActive.mockResolvedValue(null);
    render(<PosShiftPage />);

    expect(await screen.findByRole('heading', { name: /tidak ada shift aktif/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /rekap shift/i })).toBeNull();
  });
});
