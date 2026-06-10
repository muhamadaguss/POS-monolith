export type PlanCode = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';

export interface Plan {
  plan: PlanCode;
  name: string;
  price: number;
  maxOutlets: number;
  maxStaff: number;
  features: string[];
}

export interface Subscription {
  plan: PlanCode;
  planName: string;
  price: number;
  status: TenantStatus;
  trialEndsAt: string | null;
  limits: { maxOutlets: number; maxStaff: number };
  usage: { outlets: number; staff: number };
}

export interface Invoice {
  id: string;
  plan: PlanCode;
  planName: string;
  amount: number;
  startDate: string;
  endDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
  invoiceRef: string | null;
  createdAt: string;
}

export interface SubscribeResult {
  id: string;
  plan: PlanCode;
  planName: string;
  amount: number;
  isPaid: boolean;
  invoiceRef: string | null;
}
