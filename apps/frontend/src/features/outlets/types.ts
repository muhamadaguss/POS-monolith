export interface Outlet {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  isActive: boolean;
  timezone: string | null;
  taxRate: number;
  receiptNote: string | null;
  createdAt: string;
}

export interface CreateOutletPayload {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  taxRate?: number; // 0..1 (mis. 0.11 = 11%)
  receiptNote?: string;
}

export interface UpdateOutletPayload {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  taxRate?: number;
  receiptNote?: string;
  isActive?: boolean;
}
