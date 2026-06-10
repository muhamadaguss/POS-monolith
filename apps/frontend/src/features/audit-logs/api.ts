import { api } from '@/lib/api';

export interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userName?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditLogResult {
  items: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function getAuditLogs(params?: {
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}): Promise<AuditLogResult> {
  const q = new URLSearchParams();
  if (params?.userId) q.set('userId', params.userId);
  if (params?.action) q.set('action', params.action);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  // Backend mengembalikan { items, meta } (sudah di-unwrap dari envelope success/data).
  const { data } = await api.get<AuditLogResult>(`/audit-logs?${q}`);
  return data;
}
