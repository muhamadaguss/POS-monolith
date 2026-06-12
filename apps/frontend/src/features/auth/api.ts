// Tipe domain auth. Pemanggilan login/select-outlet/logout kini lewat Auth.js
// (`signIn`/`signOut`) + Server Action (`features/auth/actions.ts`), bukan axios.

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

export interface SelectOutletResponse {
  accessToken: string;
  /** Refresh token baru hasil rotasi — currentOutletId-nya sudah konsisten. */
  refreshToken: string;
  currentOutletId: string;
  role: string;
  permissions: string[];
}
