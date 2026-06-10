import { api } from '@/lib/api';
import type {
  ProductListItem,
  ProductListResult,
  ProductQuery,
  Category,
  CategoryPayload,
  OutletPriceRow,
  SetPricePayload,
  CreateProductPayload,
  UpdateProductPayload,
  ProductStatus,
} from './types';

// ---- Bentuk mentah dari backend (Decimal datang sebagai string/number) ----

interface RawInlinePrice {
  costPrice: number | string;
  sellPrice: number | string;
  variantId: string | null;
}

interface RawProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  status: ProductStatus;
  hasVariants: boolean;
  category: { id: string; name: string; color: string | null } | null;
  variants: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    status: ProductStatus;
  }[];
  outletPrices?: RawInlinePrice[];
}

function mapProduct(p: RawProduct): ProductListItem {
  // Harga produk (variantId null) di outlet konteks, bila ada.
  const base = p.outletPrices?.find((op) => op.variantId === null);
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    description: p.description,
    imageUrl: p.imageUrl,
    unit: p.unit,
    status: p.status,
    hasVariants: p.hasVariants,
    category: p.category,
    variants: p.variants,
    sellPrice: base ? Number(base.sellPrice) : null,
    costPrice: base ? Number(base.costPrice) : null,
  };
}

// ---- Produk ----

export async function listProducts(query: ProductQuery): Promise<ProductListResult> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.status) params.set('status', query.status);
  if (query.outletId) params.set('outletId', query.outletId);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 20));

  const { data } = await api.get<{ items: RawProduct[]; meta: ProductListResult['meta'] }>(
    `/products?${params}`,
  );
  return { items: data.items.map(mapProduct), meta: data.meta };
}

/**
 * Origin backend tanpa segmen /api/v1 — dipakai untuk menyusun URL absolut
 * gambar yang dilayani sebagai static file di /uploads/...
 */
const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
).replace(/\/api\/v1\/?$/, '');

/** Ubah path relatif (/uploads/...) menjadi URL absolut yang bisa dimuat <img>. */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Upload satu gambar produk → kembalikan path relatif (mis. /uploads/products/x.png). */
export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  // Jangan set Content-Type manual: biarkan browser mengisi boundary multipart.
  // Default JSON dari instance `api` di-override jadi undefined agar tidak menempel.
  const { data } = await api.post<{ url: string }>('/products/upload-image', form, {
    headers: { 'Content-Type': undefined },
  });
  return data.url;
}

/**
 * Statistik ringkas untuk kartu header — MENGIKUTI filter aktif di tabel
 * (search, categoryId, status). Dua count ringan: total (sesuai filter) +
 * active (filter yang sama + status ACTIVE). Jika filter status sudah dipilih
 * non-ACTIVE, "active" otomatis 0 karena tak beririsan.
 */
export async function getProductStats(
  filter: Pick<ProductQuery, 'search' | 'categoryId' | 'status'> = {},
): Promise<{ total: number; active: number }> {
  const params = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ page: '1', limit: '1' });
    if (filter.search) p.set('search', filter.search);
    if (filter.categoryId) p.set('categoryId', filter.categoryId);
    if (filter.status) p.set('status', filter.status);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  };
  // "active" = filter yang sama tapi status dipaksa ACTIVE (override status filter).
  const [all, active] = await Promise.all([
    api.get<{ meta: { total: number } }>(`/products?${params({})}`),
    api.get<{ meta: { total: number } }>(`/products?${params({ status: 'ACTIVE' })}`),
  ]);
  return { total: all.data.meta.total, active: active.data.meta.total };
}

export async function createProduct(payload: CreateProductPayload): Promise<void> {
  await api.post('/products', payload);
}

export async function updateProduct(id: string, payload: UpdateProductPayload): Promise<void> {
  await api.patch(`/products/${id}`, payload);
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

// ---- Kategori ----

interface RawCategory {
  id: string;
  name: string;
  color: string | null;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
}

function mapCategory(c: RawCategory): Category {
  return {
    id: c.id,
    name: c.name,
    color: c.color,
    iconUrl: c.iconUrl,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: c._count?.products ?? 0,
  };
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<RawCategory[]>('/categories');
  return data.map(mapCategory);
}

export async function createCategory(payload: CategoryPayload): Promise<void> {
  await api.post('/categories', payload);
}

export async function updateCategory(id: string, payload: CategoryPayload): Promise<void> {
  await api.patch(`/categories/${id}`, payload);
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// ---- Harga per outlet ----

interface RawOutletPrice {
  id: string;
  outletId: string;
  variantId: string | null;
  costPrice: number | string;
  sellPrice: number | string;
  outlet: { id: string; name: string };
  variant: { id: string; name: string; sku: string } | null;
}

export async function getProductPrices(productId: string): Promise<OutletPriceRow[]> {
  const { data } = await api.get<RawOutletPrice[]>(`/products/${productId}/prices`);
  const mapped = data.map((row) => ({
    id: row.id,
    outletId: row.outletId,
    outletName: row.outlet.name,
    variantId: row.variantId,
    variantName: row.variant?.name ?? null,
    costPrice: Number(row.costPrice),
    sellPrice: Number(row.sellPrice),
  }));
  // Deduplicate by (outletId, variantId) — DB membolehkan multiple NULL pada
  // unique index variantId; simpan baris terakhir (paling baru) per kombinasi.
  const seen = new Map<string, OutletPriceRow>();
  for (const row of mapped) {
    seen.set(`${row.outletId}::${row.variantId ?? '__null__'}`, row);
  }
  return Array.from(seen.values());
}

export async function setProductPrice(productId: string, payload: SetPricePayload): Promise<void> {
  await api.post(`/products/${productId}/prices`, payload);
}

/** Ekstrak pesan error API yang ramah (mis. SKU 409). */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  return (
    (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      ? ([] as string[]).concat(
          (err as { response: { data: { message: string | string[] } } }).response.data.message,
        )[0]
      : undefined
  ) ?? fallback;
}
