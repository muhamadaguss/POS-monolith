'use server';

import { auth } from '@/auth';
import type {
  AdminUser,
  AssignableRole,
  ResetPasswordResult,
  UserStatusValue,
  PlanCode,
  TenantStatus,
  TenantPlanUpdateResult,
  TenantStatusUpdateResult,
  CreateTenantInput,
  CreateTenantResult,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** Helper fetch backend dgn Bearer dari session (server-only). */
async function adminFetch<T>(path: string, init: RequestInit): Promise<T> {
  const session = await auth();
  const accessToken = session?.backendAccessToken;
  if (!accessToken) throw new Error('Sesi tidak valid');

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    let message = 'Permintaan gagal';
    try {
      const body = await res.json();
      message = Array.isArray(body?.message) ? body.message[0] : (body?.message ?? message);
    } catch {
      /* abaikan */
    }
    throw new Error(message);
  }
  return unwrap<T>(await res.json());
}

export async function setUserStatusAction(
  id: string,
  status: UserStatusValue,
): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function setUserRoleAction(id: string, role: AssignableRole): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function resetUserPasswordAction(id: string): Promise<ResetPasswordResult> {
  return adminFetch<ResetPasswordResult>(`/admin/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ── Manajemen Tenant ────────────────────────────────────────────────────────

export async function setTenantStatusAction(
  id: string,
  status: TenantStatus,
): Promise<TenantStatusUpdateResult> {
  return adminFetch<TenantStatusUpdateResult>(`/admin/tenants/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function setTenantPlanAction(
  id: string,
  plan: PlanCode,
): Promise<TenantPlanUpdateResult> {
  return adminFetch<TenantPlanUpdateResult>(`/admin/tenants/${id}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan }),
  });
}

export async function createTenantAction(input: CreateTenantInput): Promise<CreateTenantResult> {
  return adminFetch<CreateTenantResult>('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
