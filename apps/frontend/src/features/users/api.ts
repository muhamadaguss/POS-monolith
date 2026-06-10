import { api } from '@/lib/api';

export interface OutletRole {
  role: string;
  outlet: { id: string; name: string };
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'TENANT_OWNER' | 'STORE_MANAGER' | 'CASHIER';
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  outletRoles: OutletRole[];
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'STORE_MANAGER' | 'CASHIER';
  outletId: string;
  pin?: string;
}

export interface UpdateStaffPayload {
  name?: string;
  phone?: string;
  password?: string;
  pin?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function getStaff(): Promise<StaffMember[]> {
  const { data } = await api.get<StaffMember[]>('/users');
  return data;
}

export async function createStaff(payload: CreateStaffPayload): Promise<StaffMember> {
  const { data } = await api.post<StaffMember>('/users', payload);
  return data;
}

export async function updateStaff(id: string, payload: UpdateStaffPayload): Promise<StaffMember> {
  const { data } = await api.patch<StaffMember>(`/users/${id}`, payload);
  return data;
}

export async function deactivateStaff(id: string): Promise<{ id: string; name: string; status: string }> {
  const { data } = await api.delete(`/users/${id}`);
  return data as { id: string; name: string; status: string };
}

export async function assignOutletRole(
  userId: string,
  outletId: string,
  role: 'STORE_MANAGER' | 'CASHIER',
): Promise<void> {
  await api.post(`/users/${userId}/assign-role`, { outletId, role });
}

export async function unassignOutletRole(
  userId: string,
  outletId: string,
): Promise<void> {
  await api.delete(`/users/${userId}/assign-role`, { data: { outletId } });
}
