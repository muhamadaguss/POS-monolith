export type PlanCode = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';

export interface PlatformStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  cancelled: number;
  mrr: number;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  email: string;
  plan: PlanCode;
  status: TenantStatus;
  maxOutlets: number;
  maxStaff: number;
  outletCount: number;
  staffCount: number;
  trialEndsAt: string | null;
  createdAt: string;
}

export interface TenantListResult {
  items: TenantListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TenantSubscription {
  id: string;
  plan: PlanCode;
  planName: string;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  invoiceRef: string | null;
  createdAt: string;
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  billingEmail: string | null;
  plan: PlanCode;
  planName: string;
  status: TenantStatus;
  trialEndsAt: string | null;
  limits: { maxOutlets: number; maxStaff: number };
  stats: { outlets: number; staff: number; products: number; transactions: number };
  subscriptions: TenantSubscription[];
  createdAt: string;
}

export interface TenantQuery {
  search?: string;
  status?: TenantStatus;
  plan?: PlanCode;
  page?: number;
  limit?: number;
}

// ── Manajemen User (lintas-tenant, Super Admin) ─────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'TENANT_OWNER' | 'STORE_MANAGER' | 'CASHIER';
export type UserStatusValue = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
/** Role yang boleh ditetapkan via UI (tanpa SUPER_ADMIN). */
export type AssignableRole = 'TENANT_OWNER' | 'STORE_MANAGER' | 'CASHIER';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatusValue;
  tenantId: string | null;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  tenant: { id: string; name: string; slug: string } | null;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ResetPasswordResult {
  password: string;
  message: string;
}
