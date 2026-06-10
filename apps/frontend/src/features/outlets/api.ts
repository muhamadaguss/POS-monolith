import { api } from '@/lib/api';
import type { Outlet, CreateOutletPayload, UpdateOutletPayload } from './types';

interface RawOutlet extends Omit<Outlet, 'taxRate'> {
  taxRate: number | string;
}

function mapOutlet(o: RawOutlet): Outlet {
  return { ...o, taxRate: Number(o.taxRate) };
}

export async function listOutlets(): Promise<Outlet[]> {
  const { data } = await api.get<RawOutlet[]>('/outlets');
  return data.map(mapOutlet);
}

export async function createOutlet(payload: CreateOutletPayload): Promise<Outlet> {
  const { data } = await api.post<RawOutlet>('/outlets', payload);
  return mapOutlet(data);
}

export async function updateOutlet(id: string, payload: UpdateOutletPayload): Promise<Outlet> {
  const { data } = await api.patch<RawOutlet>(`/outlets/${id}`, payload);
  return mapOutlet(data);
}

/** Ekstrak pesan error API yang ramah (mis. batas paket terlampaui). */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg ?? fallback;
}
