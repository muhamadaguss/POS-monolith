import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * Regresi BUG-2: `POST /transactions` dengan `items: []` (keranjang kosong)
 * dulu lolos validasi → membuat transaksi COMPLETED total Rp 0. DTO sekarang
 * memakai @ArrayNotEmpty(). Uji langsung pada DTO (tanpa DB / HTTP).
 */
function validate(payload: unknown) {
  const dto = plainToInstance(CreateTransactionDto, payload);
  return validateSync(dto, { whitelist: true });
}

const validItem = { productId: 'p1', quantity: 2 };
const base = { outletId: 'o1', paymentMethod: 'CASH', amountPaid: 50000 };

describe('CreateTransactionDto', () => {
  it('MENOLAK items kosong (regresi BUG-2)', () => {
    const errors = validate({ ...base, items: [] });
    const itemsErr = errors.find((e) => e.property === 'items');
    expect(itemsErr).toBeDefined();
    expect(JSON.stringify(itemsErr?.constraints)).toMatch(/minimal 1 item|arrayNotEmpty/i);
  });

  it('MENOLAK items tidak ada sama sekali', () => {
    const errors = validate({ ...base });
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('MENERIMA minimal 1 item valid', () => {
    const errors = validate({ ...base, items: [validItem] });
    expect(errors.find((e) => e.property === 'items')).toBeUndefined();
  });
});
