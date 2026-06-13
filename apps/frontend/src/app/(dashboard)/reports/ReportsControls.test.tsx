import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReportsTabNav } from './ReportsTabNav';
import { CompareToggle, TopLimitSelect } from './ReportsParamControls';
import { ReportsControls } from './ReportsControls';

// Komponen ini mengubah URL (router.push) — bukan fetch. searchParams disuntik.
const push = vi.fn();
const refresh = vi.fn();
let currentParams = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(currentParams),
}));

// ReportsControls mengimpor exportSalesXlsx (axios) — di-mock agar tak menyentuh jaringan.
vi.mock('@/features/reports/api', () => ({
  exportSalesXlsx: vi.fn(),
  apiErrorMessage: (_e: unknown, f: string) => f,
}));

describe('ReportsTabNav (ubah ?tab=)', () => {
  beforeEach(() => {
    push.mockClear();
    currentParams = 'period=MONTH&page=3';
  });
  afterEach(() => cleanup());

  it('menandai tab aktif', () => {
    render(<ReportsTabNav active="analytics" />);
    expect(screen.getByText('Analitik').className).toContain('text-emerald-700');
  });

  it('klik tab lain → push dengan tab baru & reset page', () => {
    render(<ReportsTabNav active="sales" />);
    fireEvent.click(screen.getByText('Produk Terlaris'));
    expect(push).toHaveBeenCalledTimes(1);
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain('tab=products');
    expect(url).toContain('period=MONTH'); // param lain dipertahankan
    expect(url).not.toContain('page='); // pagination direset antar tab
  });

  it('klik tab yang sama → tidak push', () => {
    render(<ReportsTabNav active="sales" />);
    fireEvent.click(screen.getByText('Penjualan'));
    expect(push).not.toHaveBeenCalled();
  });
});

describe('CompareToggle (ubah ?compare=)', () => {
  beforeEach(() => {
    push.mockClear();
    currentParams = 'tab=sales';
  });
  afterEach(() => cleanup());

  it('centang → compare=1', () => {
    render(<CompareToggle checked={false} />);
    fireEvent.click(screen.getByRole('checkbox'));
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain('compare=1');
  });

  it('hapus centang → param compare dibuang', () => {
    currentParams = 'tab=sales&compare=1';
    render(<CompareToggle checked={true} />);
    fireEvent.click(screen.getByRole('checkbox'));
    const url = push.mock.calls[0][0] as string;
    expect(url).not.toContain('compare=1');
  });
});

describe('TopLimitSelect (ubah ?limit=)', () => {
  beforeEach(() => {
    push.mockClear();
    currentParams = 'tab=products';
  });
  afterEach(() => cleanup());

  it('pilih Top 25 → limit=25', () => {
    render(<TopLimitSelect value={10} />);
    fireEvent.change(screen.getByLabelText('Jumlah produk terlaris'), { target: { value: '25' } });
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain('limit=25');
  });
});

describe('ReportsControls (ganti periode mempertahankan param lain)', () => {
  beforeEach(() => {
    push.mockClear();
    // Sedang di tab analytics dgn limit & page tertentu.
    currentParams = 'tab=analytics&limit=25&page=3';
  });
  afterEach(() => cleanup());

  const baseProps = {
    isOwner: true,
    outlets: [{ id: 'o1', name: 'Cabang A' }],
    pickedOutletId: '',
    preset: 'MONTH' as const,
    customStart: '',
    customEnd: '',
    range: 'MONTH' as const,
    outletParam: undefined,
  };

  it('klik 7 Hari → period=WEEK tapi tab & limit DIPERTAHANKAN, page direset', () => {
    render(<ReportsControls {...baseProps} />);
    fireEvent.click(screen.getByText('7 Hari'));
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain('period=WEEK');
    expect(url).toContain('tab=analytics'); // tab dipertahankan (regresi yg diperbaiki)
    expect(url).toContain('limit=25'); // param lain dipertahankan
    expect(url).not.toContain('page='); // pagination direset saat ganti periode
  });

  it('ganti cabang (Owner) → outlet diset, tab dipertahankan', () => {
    render(<ReportsControls {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Pilih cabang'), { target: { value: 'o1' } });
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain('outlet=o1');
    expect(url).toContain('tab=analytics');
  });
});
