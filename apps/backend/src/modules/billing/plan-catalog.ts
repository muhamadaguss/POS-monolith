import { SubscriptionPlan } from '@prisma/client';

export interface PlanDef {
  plan: SubscriptionPlan;
  name: string;
  /** Harga per bulan (Rupiah). FREE = 0. */
  price: number;
  maxOutlets: number;
  maxStaff: number;
  features: string[];
}

// Batas "tanpa batas" diwakili angka besar agar tetap numerik di DB.
const UNLIMITED = 999;

export const PLAN_CATALOG: Record<SubscriptionPlan, PlanDef> = {
  FREE: {
    plan: 'FREE',
    name: 'Free',
    price: 0,
    maxOutlets: 1,
    maxStaff: 5,
    features: ['1 outlet', '5 staf', 'Fitur kasir dasar', 'Laporan penjualan'],
  },
  STARTER: {
    plan: 'STARTER',
    name: 'Starter',
    price: 99_000,
    maxOutlets: 3,
    maxStaff: 15,
    features: ['3 outlet', '15 staf', 'Semua fitur Free', 'Manajemen stok & transfer'],
  },
  GROWTH: {
    plan: 'GROWTH',
    name: 'Growth',
    price: 299_000,
    maxOutlets: 5,
    maxStaff: 50,
    features: ['5 outlet', '50 staf', 'Semua fitur Starter', 'Audit log & laporan lanjutan'],
  },
  ENTERPRISE: {
    plan: 'ENTERPRISE',
    name: 'Enterprise',
    price: 799_000,
    maxOutlets: UNLIMITED,
    maxStaff: UNLIMITED,
    features: ['Outlet tanpa batas', 'Staf tanpa batas', 'Semua fitur Growth', 'Dukungan prioritas'],
  },
};

export const PLAN_LIST: PlanDef[] = [
  PLAN_CATALOG.FREE,
  PLAN_CATALOG.STARTER,
  PLAN_CATALOG.GROWTH,
  PLAN_CATALOG.ENTERPRISE,
];
