import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReceiptDialog } from './ReceiptDialog';
import type { ReceiptData } from '../types';

const data: ReceiptData = {
  id: 'trx-1',
  receiptNumber: 'INV-2026-0001',
  createdAt: '2026-06-11T10:30:00.000Z',
  status: 'COMPLETED',
  paymentMethod: 'CASH',
  subtotal: '20000',
  discountAmount: '0',
  taxAmount: '2200',
  totalAmount: '22200',
  amountPaid: '50000',
  changeAmount: '27800',
  items: [
    { productName: 'Es Teh Manis', variantName: null, quantity: '2', unitPrice: '5000', subtotal: '10000' },
  ],
  outlet: {
    id: 'o1', name: 'Toko Uji', address: null, city: null, phone: null,
    taxRate: '0.11', receiptNote: 'Terima kasih',
  },
  cashier: { id: 'u1', name: 'Andi' },
};

describe('ReceiptDialog', () => {
  beforeEach(() => {
    delete (navigator as unknown as { bluetooth?: unknown }).bluetooth;
    document.getElementById('receipt-page-size')?.remove();
  });
  afterEach(() => cleanup());

  it('tidak merender apa pun bila data null', () => {
    const { container } = render(
      <ReceiptDialog open onOpenChange={() => {}} data={null} />,
    );
    expect(container.querySelector('.receipt-print-root')).toBeNull();
  });

  it('menyembunyikan tombol Thermal bila Web Bluetooth tak didukung', () => {
    render(<ReceiptDialog open onOpenChange={() => {}} data={data} />);
    expect(screen.queryByRole('button', { name: /thermal/i })).toBeNull();
    // Jalur PDF universal tetap ada.
    expect(screen.getByRole('button', { name: /cetak \/ pdf/i })).toBeInTheDocument();
  });

  it('menampilkan tombol Thermal bila navigator.bluetooth tersedia', () => {
    (navigator as unknown as { bluetooth: object }).bluetooth = {};
    render(<ReceiptDialog open onOpenChange={() => {}} data={data} />);
    expect(screen.getByRole('button', { name: /thermal/i })).toBeInTheDocument();
  });

  it('Cetak / PDF memanggil window.print() dan menyuntik @page dinamis', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<ReceiptDialog open onOpenChange={() => {}} data={data} />);

    fireEvent.click(screen.getByRole('button', { name: /cetak \/ pdf/i }));

    expect(printSpy).toHaveBeenCalledOnce();
    const injected = document.getElementById('receipt-page-size');
    expect(injected).not.toBeNull();
    // Ukuran kertas thermal 80mm dengan tinggi eksplisit (bukan `auto`).
    expect(injected?.textContent).toMatch(/@page\s*\{\s*size:\s*80mm\s+\d+mm/);
    printSpy.mockRestore();
  });

  it('membersihkan style @page saat event afterprint', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<ReceiptDialog open onOpenChange={() => {}} data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /cetak \/ pdf/i }));
    expect(document.getElementById('receipt-page-size')).not.toBeNull();

    window.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById('receipt-page-size')).toBeNull();
  });
});
