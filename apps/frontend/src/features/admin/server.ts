import 'server-only';
import { serverFetch } from '@/lib/session';
import type {
  PlatformStats,
  TenantListResult,
  TenantDetail,
  TenantQuery,
  AdminUserStats,
} from './types';

/**
 * Server fetchers untuk Manajemen Tenant (RSC, khusus Super Admin).
 * Memakai `serverFetch` (DAL) → verifikasi sesi + Bearer + unwrap envelope.
 * Konsumen: Server Component `app/admin/tenants/*`. Mutasi lewat Server Actions
 * di `features/admin/actions.ts`.
 */

const PAGE_SIZE = 20;

/** Statistik platform untuk KPI di header daftar tenant. */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  return serverFetch<PlatformStats>('/admin/stats');
}

/** Daftar tenant terfilter + paginasi (search/status/plan via query). */
export async function fetchTenants(query: TenantQuery): Promise<TenantListResult> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.plan) params.set('plan', query.plan);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? PAGE_SIZE));
  return serverFetch<TenantListResult>(`/admin/tenants?${params}`);
}

/** Detail satu tenant (profil, statistik, riwayat langganan). */
export async function fetchTenant(id: string): Promise<TenantDetail> {
  return serverFetch<TenantDetail>(`/admin/tenants/${id}`);
}

/** Statistik user lintas-platform untuk KPI Manajemen User. */
export async function fetchUserStats(): Promise<AdminUserStats> {
  return serverFetch<AdminUserStats>('/admin/users/stats');
}
