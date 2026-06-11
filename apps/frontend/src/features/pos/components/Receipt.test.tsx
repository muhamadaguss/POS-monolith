import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Receipt } from './Receipt';
import type { ReceiptData } from '../types';

const baseData: ReceiptData = {
  id: 'trx-1',
  receiptNumber: 'INV-2026-0001',
  createdAt: '2026-06-11T10:30:00.000Z',
  status: 'COMPLETED',
  paymentMethod: 'CASH',
  // Decimal dari backend bisa string — Receipt harus mengoersi via toNum.
  subtotal: '20000',
  discountAmount: '0',
  taxAmount: '2200',
  totalAmount: '22200',
  amountPaid: '50000',
  changeAmount: '27800',
  items: [
    { productName: 'Es Teh Manis', variantName: null, quantity: '2', unitPrice: '5000', subtotal: '10000' },
    { productName: 'Kopi', variantName: 'Large', quantity: '1', unitPrice: '10000', subtotal: '10000' },
  ],
  outlet: {
    id: 'o1',
    name: 'Kasirku Cabang Senayan',
    address: 'Jl. Sudirman 1',
    city: 'Jakarta',
    phone: '021-12345',
    taxRate: '0.11',
    receiptNote: 'Terima kasih telah berbelanja',
  },
  cashier: { id: 'u1', name: 'Andi Kasir' },
};

describe('Receipt', () => {
  it('menampilkan header outlet lengkap', () => {
    render(<Receipt data={baseData} />);
    expect(screen.getByText('Kasirku Cabang Senayan')).toBeInTheDocument();
    expect(screen.getByText('Jl. Sudirman 1')).toBeInTheDocument();
    expect(screen.getByText('Jakarta')).toBeInTheDocument();
    expect(screen.getByText('Telp: 021-12345')).toBeInTheDocument();
  });

  it('menampilkan nomor struk, kasir & metode bayar', () => {
    render(<Receipt data={baseData} />);
    expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Andi Kasir')).toBeInTheDocument();
    expect(screen.getByText('Tunai')).toBeInTheDocument();
  });

  it('menampilkan item dengan varian & subtotal (Decimal string dikoersi)', () => {
    render(<Receipt data={baseData} />);
    expect(screen.getByText('Es Teh Manis')).toBeInTheDocument();
    expect(screen.getByText('Kopi (Large)')).toBeInTheDocument();
    // total ter-format Rupiah
    expect(screen.getByText('Rp 22.200')).toBeInTheDocument();
  });

  it('menampilkan kembalian & catatan kaki', () => {
    render(<Receipt data={baseData} />);
    expect(screen.getByText('Rp 27.800')).toBeInTheDocument(); // kembalian
    expect(screen.getByText('Terima kasih telah berbelanja')).toBeInTheDocument();
  });

  it('menyembunyikan baris diskon bila 0, menampilkan pajak bila > 0', () => {
    render(<Receipt data={baseData} />);
    expect(screen.queryByText('Diskon')).not.toBeInTheDocument();
    expect(screen.getByText('Pajak')).toBeInTheDocument();
  });

  it('memberi id target cetak #receipt-print-area hanya saat forPrint', () => {
    // Default (pratinjau di dialog): tanpa id agar tidak bentrok dengan versi cetak.
    const preview = render(<Receipt data={baseData} />);
    expect(preview.container.querySelector('#receipt-print-area')).toBeNull();
    preview.unmount();

    // forPrint (di-portal ke body): punya id sebagai target @media print.
    const print = render(<Receipt data={baseData} forPrint />);
    expect(print.container.querySelector('#receipt-print-area')).not.toBeNull();
  });
});
