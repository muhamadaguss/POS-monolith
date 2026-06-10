import { api, getRefreshToken } from '@/lib/api';

export interface LoginPayload {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface OutletOption {
  id: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string | null;
    currentOutletId: string | null;
    permissions: string[];
  };
  outlets: OutletOption[];
}

export interface SelectOutletResponse {
  accessToken: string;
  /** Refresh token baru hasil rotasi — currentOutletId-nya sudah konsisten. */
  refreshToken: string;
  currentOutletId: string;
  role: string;
  permissions: string[];
}

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function selectOutletApi(outletId: string): Promise<SelectOutletResponse> {
  // Kirim refresh token saat ini agar backend bisa merotasinya (currentOutletId
  // konsisten antara access & refresh token).
  const refreshToken = getRefreshToken() ?? undefined;
  const { data } = await api.post<SelectOutletResponse>('/auth/select-outlet', {
    outletId,
    ...(refreshToken && { refreshToken }),
  });
  return data;
}

export async function logoutApi(refreshToken?: string): Promise<void> {
  await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
}
