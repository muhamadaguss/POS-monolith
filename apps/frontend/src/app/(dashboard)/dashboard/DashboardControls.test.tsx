import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DashboardControls } from './DashboardControls';

// Komponen ini mengubah URL (router.push/refresh) — bukan fetch.
const push = vi.fn();
const refresh = vi.fn();
let currentParams = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(currentParams),
}));

const baseProps = {
  isOwner: true,
  outlets: [{ id: 'o1', name: 'Cabang A' }],
  selectedOutletId: '',
  period: 'WEEK' as const,
};

describe('DashboardControls (ubah URL searchParams)', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    currentParams = 'period=WEEK';
  });
  afterEach(() => cleanup());

  it('menandai periode aktif', () => {
    render(<DashboardControls {...baseProps} />);
    expect(screen.getByText('7 Hari').className).toContain('bg-white');
  });

  it('klik 30 Hari → push period=MONTH', () => {
    render(<DashboardControls {...baseProps} />);
    fireEvent.click(screen.getByText('30 Hari'));
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain('period=MONTH');
  });

  it('Owner: ganti cabang → outlet diset', () => {
    render(<DashboardControls {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Pilih cabang'), { target: { value: 'o1' } });
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain('outlet=o1');
  });

  it('non-Owner: tidak ada pemilih cabang', () => {
    render(<DashboardControls {...baseProps} isOwner={false} />);
    expect(screen.queryByLabelText('Pilih cabang')).toBeNull();
  });

  it('klik muat ulang → router.refresh', () => {
    render(<DashboardControls {...baseProps} />);
    fireEvent.click(screen.getByTitle('Muat ulang'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
