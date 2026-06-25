import { api } from '@/lib/api';
import type { Plan, Subscription, Invoice, SubscribeResult, PlanCode } from './types';

export async function getPlans(): Promise<Plan[]> {
  const { data } = await api.get<Plan[]>('/billing/plans');
  return data;
}

export async function getSubscription(): Promise<Subscription> {
  const { data } = await api.get<Subscription>('/billing/subscription');
  return data;
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>('/billing/invoices');
  return data;
}

export async function subscribePlan(plan: PlanCode): Promise<SubscribeResult> {
  const { data } = await api.post<SubscribeResult>('/billing/subscribe', { plan });
  return data;
}

export async function payInvoice(invoiceId: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(`/billing/invoices/${invoiceId}/pay`, {});
  return data;
}

export async function getSubscriptionSnapToken(subscriptionId: string): Promise<{ token: string; redirectUrl: string }> {
  const { data } = await api.post<{ token: string; redirectUrl: string }>(`/payment/subscription/${subscriptionId}/snap-token`);
  return data;
}

/** Ekstrak pesan error API yang ramah (mis. guardrail downgrade). */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg ?? fallback;
}
