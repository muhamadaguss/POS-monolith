import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HourlyBarChart, CategoryBreakdown, OutletComparisonChart, SalesTrendChart } from './charts';

// recharts ResponsiveContainer butuh ResizeObserver di jsdom.
beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => cleanup());

describe('HourlyBarChart', () => {
  it('empty-state bila semua revenue 0', () => {
    const data = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0, revenue: 0 }));
    render(<HourlyBarChart data={data} />);
    expect(screen.getByText(/belum ada penjualan/i)).toBeInTheDocument();
  });

  it('merender chart (bukan empty-state) bila ada revenue', () => {
    const data = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hour === 9 ? 3 : 0,
      revenue: hour === 9 ? 30000 : 0,
    }));
    render(<HourlyBarChart data={data} />);
    expect(screen.queryByText(/belum ada penjualan/i)).toBeNull();
  });
});

describe('CategoryBreakdown', () => {
  it('empty-state bila tak ada kategori', () => {
    render(<CategoryBreakdown data={[]} />);
    expect(screen.getByText(/belum ada penjualan per kategori/i)).toBeInTheDocument();
  });

  it('menampilkan nama kategori + persentase pada legend', () => {
    render(
      <CategoryBreakdown
        data={[
          { categoryName: 'Makanan', quantity: 3, revenue: 30000 },
          { categoryName: 'Minuman', quantity: 5, revenue: 10000 },
        ]}
      />,
    );
    expect(screen.getByText('Makanan')).toBeInTheDocument();
    expect(screen.getByText('Minuman')).toBeInTheDocument();
    // 30000/40000 = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});

describe('OutletComparisonChart', () => {
  it('empty-state bila semua revenue 0', () => {
    render(
      <OutletComparisonChart
        data={[{ outletName: 'Jakarta', revenue: 0, transactions: 0, profit: 0 }]}
      />,
    );
    expect(screen.getByText(/belum ada penjualan untuk dibandingkan/i)).toBeInTheDocument();
  });

  it('merender chart bila ada data (bukan empty-state)', () => {
    render(
      <OutletComparisonChart
        data={[
          { outletName: 'Jakarta', revenue: 30000, transactions: 3, profit: 6000 },
          { outletName: 'Bekasi', revenue: 50000, transactions: 5, profit: 12000 },
        ]}
      />,
    );
    expect(screen.queryByText(/belum ada penjualan untuk dibandingkan/i)).toBeNull();
  });
});

describe('SalesTrendChart', () => {
  const data = [
    { date: '2026-06-10', revenue: 10000, transactions: 2 },
    { date: '2026-06-11', revenue: 15000, transactions: 3 },
  ];

  it('empty-state bila tak ada data', () => {
    render(<SalesTrendChart data={[]} />);
    expect(screen.getByText(/belum ada data penjualan/i)).toBeInTheDocument();
  });

  it('merender tanpa overlay bila previousData tak diberikan', () => {
    render(<SalesTrendChart data={data} />);
    expect(screen.queryByText(/belum ada data penjualan/i)).toBeNull();
  });

  it('merender dengan overlay previousData tanpa error', () => {
    render(
      <SalesTrendChart
        data={data}
        previousData={[
          { date: '2026-06-08', revenue: 8000, transactions: 1 },
          { date: '2026-06-09', revenue: 9000, transactions: 2 },
        ]}
      />,
    );
    expect(screen.queryByText(/belum ada data penjualan/i)).toBeNull();
  });
});
