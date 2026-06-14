import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import {
  SubscriptionPlan,
  TenantStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AdminTenantsService } from './admin-tenants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import { PLAN_CATALOG } from '../billing/plan-catalog';
import { CreateTenantDto } from './dto/admin-tenant.dto';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

/**
 * Fokus: provisioning tenant (createTenant) — transaksi tenant+owner+outlet+
 * subscription, generate password owner (mustChangePassword), limit dari katalog,
 * dan penolakan konflik slug/email tenant/email owner.
 */
describe('AdminTenantsService - createTenant', () => {
  let service: AdminTenantsService;
  let prisma: MockPrisma;

  const baseDto: CreateTenantDto = {
    name: 'Toko Baru',
    slug: 'toko-baru',
    email: 'toko@baru.com',
    plan: SubscriptionPlan.STARTER,
    status: TenantStatus.ACTIVE,
    outletName: 'Outlet Pusat',
    ownerName: 'Pak Owner',
    ownerEmail: 'owner@baru.com',
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminTenantsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(AdminTenantsService);

    mockedBcrypt.hash.mockResolvedValue('hashed' as never);
    // Tidak ada konflik secara default.
    prisma.tenant.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.tenant.create.mockResolvedValue({
      id: 't-new',
      name: baseDto.name,
      slug: baseDto.slug,
    });
    prisma.user.create.mockResolvedValue({ id: 'u-owner' });
    prisma.outlet.create.mockResolvedValue({ id: 'o1' });
    prisma.subscription.create.mockResolvedValue({ id: 's1' });
  });

  it('membuat tenant + owner + outlet + subscription dan mengembalikan password sekali', async () => {
    const res = await service.createTenant(baseDto);

    expect(prisma.tenant.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.outlet.create).toHaveBeenCalledTimes(1);
    expect(prisma.subscription.create).toHaveBeenCalledTimes(1);

    // Owner = TENANT_OWNER + wajib ganti password.
    const userArg = prisma.user.create.mock.calls[0][0] as {
      data: { role: Role; mustChangePassword: boolean; status: UserStatus };
    };
    expect(userArg.data.role).toBe(Role.TENANT_OWNER);
    expect(userArg.data.mustChangePassword).toBe(true);
    expect(userArg.data.status).toBe(UserStatus.ACTIVE);

    // Limit tenant mengikuti katalog plan.
    const tenantArg = prisma.tenant.create.mock.calls[0][0] as {
      data: { maxOutlets: number; maxStaff: number; status: TenantStatus };
    };
    expect(tenantArg.data.maxOutlets).toBe(PLAN_CATALOG.STARTER.maxOutlets);
    expect(tenantArg.data.maxStaff).toBe(PLAN_CATALOG.STARTER.maxStaff);
    expect(tenantArg.data.status).toBe(TenantStatus.ACTIVE);

    // Subscription pakai harga katalog; plan berbayar belum lunas.
    const subArg = prisma.subscription.create.mock.calls[0][0] as {
      data: { amount: number; isPaid: boolean };
    };
    expect(subArg.data.amount).toBe(PLAN_CATALOG.STARTER.price);
    expect(subArg.data.isPaid).toBe(false);

    // Password plaintext dikembalikan sekali.
    expect(typeof res.ownerPassword).toBe('string');
    expect(res.ownerPassword.length).toBeGreaterThan(8);
    expect(res.id).toBe('t-new');
  });

  it('plan FREE → subscription lunas (amount 0)', async () => {
    await service.createTenant({ ...baseDto, plan: SubscriptionPlan.FREE });
    const subArg = prisma.subscription.create.mock.calls[0][0] as {
      data: { amount: number; isPaid: boolean };
    };
    expect(subArg.data.amount).toBe(0);
    expect(subArg.data.isPaid).toBe(true);
  });

  it('tolak bila slug sudah dipakai', async () => {
    prisma.tenant.findUnique.mockImplementation(
      ({ where }: { where: { slug?: string } }) =>
        where.slug ? Promise.resolve({ id: 'exist' }) : Promise.resolve(null),
    );
    await expect(service.createTenant(baseDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });

  it('tolak bila email tenant sudah terdaftar', async () => {
    prisma.tenant.findUnique.mockImplementation(
      ({ where }: { where: { email?: string } }) =>
        where.email ? Promise.resolve({ id: 'exist' }) : Promise.resolve(null),
    );
    await expect(service.createTenant(baseDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });

  it('tolak bila email owner sudah terdaftar', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'exist' });
    await expect(service.createTenant(baseDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });
});
