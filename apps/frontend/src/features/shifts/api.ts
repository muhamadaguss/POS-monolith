import { api } from '@/lib/api';
import type { Shift, OpenShiftPayload, CloseShiftPayload } from './types';

export async function getActiveShift(outletId: string): Promise<Shift | null> {
  try {
    const { data } = await api.get<Shift>(`/shifts/active?outletId=${outletId}`);
    return data;
  } catch (err: unknown) {
    // Hanya telan 404 (tidak ada shift aktif) — error lain (401, 500) dibiarkan naik
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function openShift(payload: OpenShiftPayload): Promise<Shift> {
  const { data } = await api.post<Shift>('/shifts/open', payload);
  return data;
}

export async function closeShift(shiftId: string, payload: CloseShiftPayload): Promise<Shift> {
  const { data } = await api.patch<Shift>(`/shifts/${shiftId}/close`, payload);
  return data;
}
