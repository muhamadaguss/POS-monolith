/**
 * Helper format terpusat (uang, angka, tanggal, inisial).
 * Sebelumnya tiap helper ini diduplikasi di belasan file; satukan di sini agar
 * formatnya konsisten dan tidak ada drift antar halaman.
 */

/** Formatter Rupiah tanpa desimal. Pakai `IDR.format(n)` atau `formatIDR(n)`. */
export const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

/**
 * Format nilai uang ke Rupiah. Aman terhadap field Prisma `Decimal` yang
 * ter-serialize sebagai string — dikoersikan dulu via {@link toNum}.
 */
export function formatIDR(value: number | string | null | undefined): string {
  return IDR.format(toNum(value));
}

/** Formatter angka biasa (ribuan), mis. "1.234". */
export const NUM = new Intl.NumberFormat('id-ID');

/**
 * Koersi nilai uang/angka dari backend ke `number`.
 * Prisma `Decimal` ter-serialize sebagai string, jadi normalkan sebelum
 * diformat atau dibandingkan.
 */
export function toNum(value: number | string | null | undefined): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

/** Inisial dari nama (maks 2 huruf), mis. "Andi Prasetyo" → "AP". */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Jam saja, mis. "14:05". */
export function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Jam + tanggal ringkas, mis. "14:05, 10 Jun". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

/** Tanggal lengkap + jam, mis. "10 Jun 2026, 14.05". Untuk audit log. */
export function formatDateTimeLong(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tanggal saja, mis. "10 Jun 2026". Mengembalikan "—" bila kosong. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Durasi sejak `openedAt` dalam format "Xj Ym" (untuk shift berjalan). */
export function formatShiftDuration(openedAt: string): string {
  const ms = Date.now() - new Date(openedAt).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}j ${m}m`;
}

/**
 * Durasi antara dua waktu dalam format "Xj Ym". Bila `closedAt` kosong (shift
 * masih berjalan), hitung sampai sekarang.
 */
export function formatDurationBetween(openedAt: string, closedAt?: string | null): string {
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  const ms = Math.max(0, end - new Date(openedAt).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}j ${m}m`;
}

/**
 * Rentang waktu shift untuk tabel riwayat, mis. "14.16 – 14.16 (0j 0m)".
 * Bila belum ditutup → "14.16 – berjalan (Xj Ym)".
 */
export function formatShiftRange(openedAt: string, closedAt?: string | null): string {
  const open = formatTimeOnly(openedAt);
  const close = closedAt ? formatTimeOnly(closedAt) : 'berjalan';
  return `${open} – ${close} (${formatDurationBetween(openedAt, closedAt)})`;
}

/** Durasi dari menit (mis. dari API stats) → "Xj Ym". */
export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}j ${m}m`;
}
