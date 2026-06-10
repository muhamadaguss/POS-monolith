import { PrismaClient, Role, SubscriptionPlan, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Super Admin (platform level, tanpa tenant)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@kasirku.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@kasirku.com',
      passwordHash: await bcrypt.hash('SuperAdmin123!', 12),
      role: Role.SUPER_ADMIN,
    },
  });
  console.log('Created super admin:', superAdmin.email);

  // 2. Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-toko' },
    update: {},
    create: {
      name: 'Demo Toko Makmur',
      slug: 'demo-toko',
      email: 'owner@demotoko.com',
      plan: SubscriptionPlan.GROWTH,
      status: TenantStatus.ACTIVE,
      maxOutlets: 5,
      maxStaff: 20,
    },
  });
  console.log('Created tenant:', tenant.slug);

  // 3. Tenant Owner
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demotoko.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Budi Santoso',
      email: 'owner@demotoko.com',
      passwordHash: await bcrypt.hash('Owner123!', 12),
      role: Role.TENANT_OWNER,
    },
  });

  // 4. Demo Outlets
  const outletJakarta = await prisma.outlet.upsert({
    where: { id: 'outlet-jakarta-demo' },
    update: {},
    create: {
      id: 'outlet-jakarta-demo',
      tenantId: tenant.id,
      name: 'Cabang Jakarta Pusat',
      address: 'Jl. Sudirman No. 1',
      city: 'Jakarta',
      taxRate: 0.11,
    },
  });

  const outletBekasi = await prisma.outlet.upsert({
    where: { id: 'outlet-bekasi-demo' },
    update: {},
    create: {
      id: 'outlet-bekasi-demo',
      tenantId: tenant.id,
      name: 'Cabang Bekasi',
      address: 'Jl. Ahmad Yani No. 88',
      city: 'Bekasi',
      taxRate: 0.11,
    },
  });

  // 5. Store Manager & Cashier
  const manager = await prisma.user.upsert({
    where: { email: 'manager@demotoko.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Siti Rahayu',
      email: 'manager@demotoko.com',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      pin: await bcrypt.hash('123456', 10),
      role: Role.STORE_MANAGER,
    },
  });

  // Manager single-outlet: hanya akses ke Cabang Bekasi
  const managerSingleOutlet = await prisma.user.upsert({
    where: { email: 'manager2@demotoko.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Rudi Hermawan',
      email: 'manager2@demotoko.com',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      pin: await bcrypt.hash('111222', 10),
      role: Role.STORE_MANAGER,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'kasir@demotoko.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Andi Prasetyo',
      email: 'kasir@demotoko.com',
      passwordHash: await bcrypt.hash('Kasir123!', 12),
      pin: await bcrypt.hash('654321', 10),
      role: Role.CASHIER,
    },
  });

  // Kasir single-outlet: hanya akses ke Cabang Bekasi
  const cashierSingleOutlet = await prisma.user.upsert({
    where: { email: 'kasir2@demotoko.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Dewi Lestari',
      email: 'kasir2@demotoko.com',
      passwordHash: await bcrypt.hash('Kasir123!', 12),
      pin: await bcrypt.hash('333444', 10),
      role: Role.CASHIER,
    },
  });

  // 6. Assign roles per outlet
  // Owner mendapat akses STORE_MANAGER di semua outlet milik tenant
  await prisma.userOutletRole.upsert({
    where: { userId_outletId: { userId: owner.id, outletId: outletJakarta.id } },
    update: {},
    create: { userId: owner.id, outletId: outletJakarta.id, tenantId: tenant.id, role: Role.STORE_MANAGER },
  });
  await prisma.userOutletRole.upsert({
    where: { userId_outletId: { userId: owner.id, outletId: outletBekasi.id } },
    update: {},
    create: { userId: owner.id, outletId: outletBekasi.id, tenantId: tenant.id, role: Role.STORE_MANAGER },
  });
  await prisma.userOutletRole.upsert({
    where: { userId_outletId: { userId: manager.id, outletId: outletJakarta.id } },
    update: {},
    create: { userId: manager.id, outletId: outletJakarta.id, tenantId: tenant.id, role: Role.STORE_MANAGER },
  });
  await prisma.userOutletRole.upsert({
    where: { userId_outletId: { userId: manager.id, outletId: outletBekasi.id } },
    update: {},
    create: { userId: manager.id, outletId: outletBekasi.id, tenantId: tenant.id, role: Role.STORE_MANAGER },
  });
  await prisma.userOutletRole.upsert({
    where: { userId_outletId: { userId: cashier.id, outletId: outletJakarta.id } },
    update: {},
    create: { userId: cashier.id, outletId: outletJakarta.id, tenantId: tenant.id, role: Role.CASHIER },
  });

  // Single-outlet: manager2 & kasir2 hanya di Cabang Bekasi
  await prisma.userOutletRole.upsert({
    where: { userId_outletId: { userId: managerSingleOutlet.id, outletId: outletBekasi.id } },
    update: {},
    create: { userId: managerSingleOutlet.id, outletId: outletBekasi.id, tenantId: tenant.id, role: Role.STORE_MANAGER },
  });
  await prisma.userOutletRole.upsert({
    where: { userId_outletId: { userId: cashierSingleOutlet.id, outletId: outletBekasi.id } },
    update: {},
    create: { userId: cashierSingleOutlet.id, outletId: outletBekasi.id, tenantId: tenant.id, role: Role.CASHIER },
  });

  // 7. Demo categories & products
  const category = await prisma.category.upsert({
    where: { id: 'cat-minuman-demo' },
    update: {},
    create: {
      id: 'cat-minuman-demo',
      tenantId: tenant.id,
      name: 'Minuman',
      color: '#3B82F6',
    },
  });

  const product = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'MNM-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      categoryId: category.id,
      name: 'Es Teh Manis',
      sku: 'MNM-001',
      unit: 'cup',
    },
  });

  // Harga di outlet Jakarta
  await prisma.outletPrice.createMany({
    data: [{
      tenantId: tenant.id,
      outletId: outletJakarta.id,
      productId: product.id,
      costPrice: 2000,
      sellPrice: 5000,
    }],
    skipDuplicates: true,
  });

  // Stok awal di outlet Jakarta
  await prisma.inventory.createMany({
    data: [{
      tenantId: tenant.id,
      outletId: outletJakarta.id,
      productId: product.id,
      quantity: 100,
      minStock: 10,
    }],
    skipDuplicates: true,
  });

  console.log('Seed completed successfully.');
  console.log('\n--- Demo Credentials ---');
  console.log('Super Admin:         superadmin@kasirku.com / SuperAdmin123!');
  console.log('Tenant Owner:        owner@demotoko.com / Owner123!');
  console.log('Manager (2 outlet):  manager@demotoko.com / Manager123!  → Jakarta + Bekasi');
  console.log('Manager (1 outlet):  manager2@demotoko.com / Manager123! → Bekasi saja (auto-login)');
  console.log('Cashier (1 outlet):  kasir@demotoko.com / Kasir123!      → Jakarta saja (auto-login)');
  console.log('Cashier (1 outlet):  kasir2@demotoko.com / Kasir123!     → Bekasi saja (auto-login)');
  console.log('Tenant slug:         demo-toko');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
