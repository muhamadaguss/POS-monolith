import { describe, it, expect } from 'vitest';
import {
  formatIDR,
  toNum,
  getInitials,
  formatDate,
  formatShiftDuration,
} from './format';

describe('toNum', () => {
  it('mengembalikan angka apa adanya', () => {
    expect(toNum(1500)).toBe(1500);
    expect(toNum(0)).toBe(0);
  });

  it('mengoersi string Decimal dari Prisma menjadi number', () => {
    // Prisma Decimal ter-serialize sebagai string — inti dari bug yang dicegah.
    expect(toNum('15000.00')).toBe(15000);
    expect(toNum('0.5')).toBe(0.5);
  });

  it('mengembalikan 0 untuk null/undefined (bukan NaN)', () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
  });
});

describe('formatIDR', () => {
  it('memformat number ke Rupiah tanpa desimal', () => {
    //   = non-breaking space yang dipakai Intl id-ID.
    expect(formatIDR(15000)).toBe('Rp 15.000');
  });

  it('aman terhadap string Decimal', () => {
    expect(formatIDR('15000.00')).toBe('Rp 15.000');
  });

  it('null/undefined → Rp 0, bukan Rp NaN', () => {
    expect(formatIDR(null)).toBe('Rp 0');
    expect(formatIDR(undefined)).toBe('Rp 0');
  });
});

describe('getInitials', () => {
  it('mengambil maksimum 2 huruf pertama, huruf besar', () => {
    expect(getInitials('Andi Prasetyo')).toBe('AP');
    expect(getInitials('budi')).toBe('B');
    expect(getInitials('Siti Nur Aisyah')).toBe('SN');
  });
});

describe('formatDate', () => {
  it('mengembalikan "—" bila kosong', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('memformat ISO menjadi tanggal id-ID', () => {
    // Pakai UTC midday agar tidak tergelincir ke hari sebelumnya di zona +07.
    expect(formatDate('2026-06-10T12:00:00.000Z')).toContain('2026');
    expect(formatDate('2026-06-10T12:00:00.000Z')).toContain('Jun');
  });
});

describe('formatShiftDuration', () => {
  it('memformat selisih waktu menjadi "Xj Ym"', () => {
    const twoHoursFifteenAgo = new Date(Date.now() - (2 * 3_600_000 + 15 * 60_000)).toISOString();
    expect(formatShiftDuration(twoHoursFifteenAgo)).toBe('2j 15m');
  });

  it('shift baru dibuka → 0j 0m', () => {
    expect(formatShiftDuration(new Date().toISOString())).toBe('0j 0m');
  });
});
