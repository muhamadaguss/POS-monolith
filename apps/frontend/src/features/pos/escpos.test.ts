import { describe, it, expect, afterEach } from 'vitest';
import { isThermalSupported, buildEscPosReceipt } from './escpos';
import type { ReceiptData } from './types';

const data: ReceiptData = {
  id: 'trx-1',
  receiptNumber: 'INV-0001',
  createdAt: '2026-06-11T10:30:00.000Z',
  status: 'COMPLETED',
  paymentMethod: 'CASH',
  subtotal: '10000',
  discountAmount: '0',
  taxAmount: '1100',
  totalAmount: '11100',
  amountPaid: '20000',
  changeAmount: '8900',
  items: [
    { productName: 'Es Teh Manis', variantName: null, quantity: '2', unitPrice: '5000', subtotal: '10000' },
  ],
  outlet: {
    id: 'o1',
    name: 'Toko Uji',
    address: null,
    city: null,
    phone: null,
    taxRate: '0.11',
    receiptNote: 'Terima kasih',
  },
  cashier: { id: 'u1', name: 'Andi' },
};

describe('isThermalSupported', () => {
  afterEach(() => {
    // Bersihkan stub bluetooth antar-test.
    delete (navigator as unknown as { bluetooth?: unknown }).bluetooth;
  });

  it('false bila navigator tanpa bluetooth', () => {
    expect(isThermalSupported()).toBe(false);
  });

  it('true bila navigator.bluetooth tersedia', () => {
    (navigator as unknown as { bluetooth: object }).bluetooth = {};
    expect(isThermalSupported()).toBe(true);
  });
});

describe('buildEscPosReceipt', () => {
  it('mengembalikan Uint8Array yang tidak kosong', () => {
    const bytes = buildEscPosReceipt(data);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('diawali perintah INIT (ESC @) dan diakhiri perintah CUT (GS V B 0)', () => {
    const bytes = buildEscPosReceipt(data);
    // INIT = 0x1b 0x40
    expect([bytes[0], bytes[1]]).toEqual([0x1b, 0x40]);
    // CUT = 0x1d 0x56 0x42 0x00 di akhir
    const tail = Array.from(bytes.slice(-4));
    expect(tail).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it('memuat teks nama outlet, nomor struk & catatan kaki', () => {
    const bytes = buildEscPosReceipt(data);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('Toko Uji');
    expect(text).toContain('INV-0001');
    expect(text).toContain('Terima kasih');
  });
});
