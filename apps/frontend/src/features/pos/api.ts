import { api } from '@/lib/api';
import type { Category, Product, Discount, CheckoutPayload, ActiveShift } from './types';

export async function fetchCategories(outletId: string): Promise<Category[]> {
  const { data } = await api.get<Category[]>(`/categories?outletId=${outletId}`);
  return data;
}

export async function fetchProducts(outletId: string, search?: string, categoryId?: string): Promise<Product[]> {
  const params = new URLSearchParams({ outletId });
  if (search) params.set('search', search);
  if (categoryId && categoryId !== 'ALL') params.set('categoryId', categoryId);
  const { data } = await api.get<Product[]>(`/products/pos-catalog?${params}`);
  return data;
}

/** Ambil tarif pajak outlet (desimal, mis. 0.11). Default 0 bila gagal. */
export async function fetchOutletTaxRate(outletId: string): Promise<number> {
  try {
    const { data } = await api.get<{ taxRate: number | string }>(`/outlets/${outletId}`);
    return Number(data.taxRate ?? 0);
  } catch {
    return 0;
  }
}

export async function fetchActiveShift(outletId: string): Promise<ActiveShift | null> {
  try {
    const { data } = await api.get<ActiveShift>(`/shifts/active?outletId=${outletId}`);
    return data;
  } catch {
    return null;
  }
}

export async function checkout(payload: CheckoutPayload) {
  const { data } = await api.post('/transactions', payload);
  return data;
}
