// Tipe-tipe untuk menu Katalog Produk (/products).
// Catatan kontrak backend:
// - GET /products → { items, meta } (paginated)
// - Harga TIDAK melekat di produk; harga per-outlet via OutletPrice.
// - outletPrices[] hanya terisi kalau query menyertakan outletId.

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

export interface CategoryRef {
  id: string;
  name: string;
  color: string | null;
}

export interface VariantRef {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  status: ProductStatus;
}

/** Satu baris harga outlet yang menyertai produk (saat query pakai outletId). */
export interface InlineOutletPrice {
  costPrice: number;
  sellPrice: number;
  variantId: string | null;
}

/** Item pada tabel katalog (hasil GET /products). */
export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  status: ProductStatus;
  hasVariants: boolean;
  category: CategoryRef | null;
  variants: VariantRef[];
  /** Harga jual produk (variantId null) di outlet konteks; null bila tak ada. */
  sellPrice: number | null;
  costPrice: number | null;
}

export interface ProductListResult {
  items: ProductListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  outletId?: string;
  page?: number;
  limit?: number;
}

// ---- Kategori ----

export interface Category {
  id: string;
  name: string;
  color: string | null;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface CategoryPayload {
  name: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ---- Harga per outlet (dialog Harga) ----

export interface OutletPriceRow {
  id: string;
  outletId: string;
  outletName: string;
  variantId: string | null;
  variantName: string | null;
  costPrice: number;
  sellPrice: number;
}

export interface SetPricePayload {
  outletId: string;
  variantId?: string;
  costPrice: number;
  sellPrice: number;
}

// ---- Form Produk (create/update) ----

export interface ProductVariantInput {
  name: string;
  sku: string;
  barcode?: string;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  imageUrl?: string;
  unit?: string;
  categoryId?: string;
  hasVariants?: boolean;
  variants?: ProductVariantInput[];
}

// PATCH tidak menerima sku.
export interface UpdateProductPayload {
  name?: string;
  barcode?: string;
  description?: string;
  imageUrl?: string;
  unit?: string;
  categoryId?: string;
  status?: ProductStatus;
}
