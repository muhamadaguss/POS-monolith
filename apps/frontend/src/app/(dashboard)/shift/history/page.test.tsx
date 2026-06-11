import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useAuthStore } from '@/features/auth/store';
import type { ShiftListResponse } from '@/features/shifts/types';

// next/link → anchor biasa; next/navigation di-stub.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/shift/history',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/shifts/api', () => ({ getShifts: vi.fn() }));

import { getShifts } from '@/features/shifts/api';
import ShiftHistoryPage from './page';

const mockedGetShifts = getShifts as unknown as ReturnType<typeof vi.fn>;

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
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    ...overrides,
  };
}

function setUser(permissions: string[], role = 'TENANT_OWNER') {
  useAuthStore.setState({
    accessToken: 'a',
    refreshToken: 'r',
    outlets: [{ id: 'o1', name: 'Cabang Jakarta Pusat' }] as never,
    user: {
      id: 'u1',
      name: 'Budi',
      email: 'owner@demotoko.com',
      role: role as never,
      tenantId: 't1',
      currentOutletId: null,
      permissions,
    },
  });
}

describe('ShiftHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetShifts.mockResolvedValue(listResponse());
  });
  afterEach(() => cleanup());

  it('menampilkan daftar shift (outlet, kasir, selisih)', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);

    expect(await screen.findByText('Cabang Jakarta Pusat')).toBeInTheDocument();
    expect(screen.getByText(/Andi Prasetyo/)).toBeInTheDocument();
    expect(screen.getByText(/5 transaksi/)).toBeInTheDocument();
  });

  it('ganti filter status memanggil getShifts dengan param status', async () => {
    setUser(['shift.manage']);
    render(<ShiftHistoryPage />);
    await screen.findByText('Cabang Jakarta Pusat');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'OPEN' } });

    await waitFor(() =>
      expect(mockedGetShifts).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'OPEN', page: 1 }),
      ),
    );
  });

  it('menampilkan empty-state bila tak ada shift', async () => {
    setUser(['shift.manage']);
    mockedGetShifts.mockResolvedValue(
      listResponse({ items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
    );
    render(<ShiftHistoryPage />);

    expect(await screen.findByText(/belum ada riwayat shift/i)).toBeInTheDocument();
  });

  it('memblokir user tanpa shift.manage (RBAC) — Akses Ditolak, tak panggil API', async () => {
    setUser(['shift.own'], 'CASHIER');
    render(<ShiftHistoryPage />);

    expect(screen.getByRole('heading', { name: /akses ditolak/i })).toBeInTheDocument();
    expect(mockedGetShifts).not.toHaveBeenCalled();
  });
});
