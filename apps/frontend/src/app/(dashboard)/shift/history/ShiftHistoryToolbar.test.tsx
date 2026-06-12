import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ShiftHistoryToolbar } from './ShiftHistoryToolbar';
import type { ShiftQuery } from '@/features/shifts/types';

// Toolbar mengubah URL (router.push) — bukan fetch. Mock router & export.
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/features/shifts/api', () => ({ exportShifts: vi.fn() }));
vi.mock('@/lib/swal', () => ({ toastSuccess: vi.fn(), errorAlert: vi.fn() }));

import { exportShifts } from '@/features/shifts/api';
const mockedExport = exportShifts as unknown as ReturnType<typeof vi.fn>;

const baseQuery: ShiftQuery = { startDate: '2026-06-06', endDate: '2026-06-12' };

function renderToolbar(overrides?: Partial<Parameters<typeof ShiftHistoryToolbar>[0]>) {
  return render(
    <ShiftHistoryToolbar
      status=""
      period="7"
      customStart=""
      customEnd=""
      search=""
      query={baseQuery}
      {...overrides}
    />,
  );
}

describe('ShiftHistoryToolbar (mengubah URL searchParams)', () => {
  beforeEach(() => push.mockClear());
  afterEach(() => cleanup());

  it('ganti preset 30 Hari mendorong period=30 ke URL', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: '30 Hari' }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('period=30'));
  });

  it('ganti status mendorong status ke URL', () => {
    renderToolbar();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'CLOSED' } });
    expect(push).toHaveBeenCalledWith(expect.stringContaining('status=CLOSED'));
  });

  it('pencarian (debounce 350ms) mendorong search ke URL', async () => {
    renderToolbar();
    fireEvent.change(screen.getByLabelText('Cari shift atau kasir'), {
      target: { value: 'Andi' },
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('search=Andi')), {
      timeout: 1000,
    });
  });

  it('tombol Export memanggil exportShifts dengan query saat ini', async () => {
    mockedExport.mockResolvedValue(undefined);
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    await waitFor(() => expect(mockedExport).toHaveBeenCalledWith(baseQuery));
  });

  it('input tanggal custom muncul saat period=CUSTOM', () => {
    renderToolbar({ period: 'CUSTOM' });
    expect(screen.getByLabelText('Tanggal mulai')).toBeInTheDocument();
    expect(screen.getByLabelText('Tanggal akhir')).toBeInTheDocument();
  });
});
