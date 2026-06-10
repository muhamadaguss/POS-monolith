import type { ProductStatus } from '../types';

export const PRODUCTS_PAGE_SIZE = 20;

export const STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
  DELETED: 'Dihapus',
};

/** Format Rupiah ringkas tanpa spasi ("Rp1.234"); "—" bila null. */
export function rupiah(n: number | null): string {
  if (n == null) return '—';
  return 'Rp' + n.toLocaleString('id-ID');
}

/**
 * Daftar nomor halaman dengan ellipsis. 'ellipsis' menandai jeda.
 * Selalu tampilkan halaman 1, terakhir, dan tetangga halaman aktif.
 */
export function pageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push('ellipsis');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push('ellipsis');
  out.push(total);
  return out;
}
