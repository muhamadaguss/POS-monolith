'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import type {
  CreateTransferPayload,
  ProcessTransferPayload,
  StockTransfer,
} from './transfers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** Fetch backend dgn Bearer dari session (server-only). */
async function backendFetch<T>(path: string, init: RequestInit): Promise<T> {
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

/** Ajukan transfer baru (status awal PENDING). */
export async function createTransferAction(
  payload: CreateTransferPayload,
): Promise<StockTransfer> {
  const result = await backendFetch<StockTransfer>('/inventory/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  revalidatePath('/transfers');
  return result;
}

/** Proses transfer PENDING: terima / tolak / batalkan. */
export async function processTransferAction(
  id: string,
  payload: ProcessTransferPayload,
): Promise<StockTransfer> {
  const result = await backendFetch<StockTransfer>(`/inventory/transfers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  revalidatePath('/transfers');
  return result;
}
