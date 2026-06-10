import { api } from '@/lib/api';
import type {
  PlatformStats,
  TenantListResult,
  TenantDetail,
  TenantQuery,
  PlanCode,
  TenantStatus,
} from './types';

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data } = await api.get<PlatformStats>('/admin/stats');
  return data;
}

export async function listTenants(query: TenantQuery): Promise<TenantListResult> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.plan) params.set('plan', query.plan);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 20));
  const { data } = await api.get<TenantListResult>(`/admin/tenants?${params}`);
  return data;
}

export async function getTenant(id: string): Promise<TenantDetail> {
  const { data } = await api.get<TenantDetail>(`/admin/tenants/${id}`);
  return data;
}

export async function updateTenantStatus(
  id: string,
  status: TenantStatus,
): Promise<{ id: string; status: TenantStatus }> {
  const { data } = await api.patch(`/admin/tenants/${id}/status`, { status });
  return data;
}

export async function updateTenantPlan(
  id: string,
  plan: PlanCode,
): Promise<{ id: string; plan: PlanCode; planName: string; warnings: string[] }> {
  const { data } = await api.patch(`/admin/tenants/${id}/plan`, { plan });
  return data;
}

/** Ekstrak pesan error API yang ramah. */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg ?? fallback;
}
