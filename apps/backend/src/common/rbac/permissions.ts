import { Role } from '@prisma/client';

// Semua permission string yang ada di sistem
export const PERMISSIONS = {
  // Outlet management
  OUTLET_MANAGE: 'outlet.manage',

  // Staff management
  STAFF_MANAGE_GLOBAL: 'staff.manage_global',
  STAFF_VIEW_LOCAL: 'staff.view_local',
  STAFF_MANAGE_LOCAL: 'staff.manage_local',

  // Product catalog
  PRODUCT_MANAGE: 'product.manage',

  // Pricing
  PRICE_MANAGE: 'price.manage',

  // Inventory
  INVENTORY_VIEW_ALL: 'inventory.view_all',
  INVENTORY_VIEW_LOCAL: 'inventory.view_local',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',

  // Shift
  SHIFT_MANAGE: 'shift.manage',
  SHIFT_OWN: 'shift.own',

  // POS Transaction
  POS_TRANSACTION: 'pos.transaction',
  POS_VOID: 'pos.void',
  POS_REFUND: 'pos.refund',

  // Reports
  REPORT_VIEW: 'report.view',

  // Billing & langganan (Owner only)
  BILLING_MANAGE: 'billing.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Permission set default per role — akan di-override oleh UserOutletRole jika ada
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(PERMISSIONS) as Permission[],

  [Role.TENANT_OWNER]: [
    PERMISSIONS.OUTLET_MANAGE,
    PERMISSIONS.STAFF_MANAGE_GLOBAL,
    PERMISSIONS.PRODUCT_MANAGE,
    PERMISSIONS.PRICE_MANAGE,
    PERMISSIONS.INVENTORY_VIEW_ALL,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.SHIFT_MANAGE,
    PERMISSIONS.POS_TRANSACTION,
    PERMISSIONS.POS_VOID,
    PERMISSIONS.POS_REFUND,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.BILLING_MANAGE,
  ],

  [Role.STORE_MANAGER]: [
    PERMISSIONS.STAFF_VIEW_LOCAL,
    PERMISSIONS.STAFF_MANAGE_LOCAL,
    PERMISSIONS.INVENTORY_VIEW_LOCAL,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.SHIFT_MANAGE,
    PERMISSIONS.POS_TRANSACTION,
    PERMISSIONS.POS_VOID,
    PERMISSIONS.POS_REFUND,
  ],

  [Role.CASHIER]: [
    PERMISSIONS.SHIFT_OWN,
    PERMISSIONS.POS_TRANSACTION,
    // POS_VOID dan POS_REFUND memerlukan PIN Manager — tidak dimasukkan default cashier
  ],
};
