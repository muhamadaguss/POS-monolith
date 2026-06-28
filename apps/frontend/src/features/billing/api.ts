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

export async function createIpaymuPayment(subscriptionId: string): Promise<{ redirectUrl: string; sessionId: string; transactionId: string }> {
  const { data } = await api.post<{ redirectUrl: string; sessionId: string; transactionId: string }>(`/payment/subscription/${subscriptionId}/pay`);
  return data;
}

/** Verifikasi pembayaran via SessionId (sid) dari iPaymu return URL — client-side call. */
export async function verifyReturnBySid(params: { sid: string; trx_id?: string; status?: string }): Promise<{ success: boolean; isPaid?: boolean; message?: string }> {
  const { data } = await api.post<{ success: boolean; isPaid?: boolean; message?: string }>('/payment/return-verify-by-sid', params);
  // Handle response wrapper: data.data or data itself
  const result = (data as any).data ?? data;
  return result;
}

/** Ekstrak pesan error API yang ramah (mis. guardrail downgrade). */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg ?? fallback;
}
