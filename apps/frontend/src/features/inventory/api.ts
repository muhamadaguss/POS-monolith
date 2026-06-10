import { api } from '@/lib/api';

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variantName: string | null;
  categoryName: string;
  outletId: string;
  quantity: number;
  minStock: number;
  unit: string;
}

interface BackendInventoryItem {
  id: string;
  productId: string;
  outletId: string;
  quantity: number | string;
  minStock: number | string;
  product: { id: string; name: string; sku: string; unit: string; category: { name: string } | null };
  variant: { name: string; sku: string } | null;
  isLowStock?: boolean;
}

function mapItem(inv: BackendInventoryItem): InventoryItem {
  return {
    id: inv.id,
    productId: inv.productId,
    outletId: inv.outletId,
    productName: inv.product.name,
    sku: inv.variant?.sku ?? inv.product.sku,
    variantName: inv.variant?.name ?? null,
    categoryName: inv.product.category?.name ?? '-',
    unit: inv.product.unit,
    quantity: Number(inv.quantity),
    minStock: Number(inv.minStock),
  };
}

export interface StockAdjustmentPayload {
  outletId: string;
  items: { productId: string; physicalCount: number; note?: string }[];
}

export async function getInventory(outletId: string, search?: string, categoryName?: string): Promise<InventoryItem[]> {
  const params = new URLSearchParams({ outletId, limit: '100' });
  if (search) params.set('search', search);
  const { data } = await api.get<{ items: BackendInventoryItem[]; meta: unknown }>(`/inventory?${params}`);
  const items = data.items.map(mapItem);
  if (categoryName) return items.filter((i) => i.categoryName === categoryName);
  return items;
}

export async function createStockAdjustment(payload: StockAdjustmentPayload): Promise<void> {
  await api.post('/inventory/adjustments', payload);
}
