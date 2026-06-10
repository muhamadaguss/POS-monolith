import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OutletsService } from './outlets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

const owner: AuthenticatedUser = {
  userId: 'owner-1',
  tenantId: 'tenant-1',
  role: Role.TENANT_OWNER,
  currentOutletId: null,
  permissions: ['outlet.manage'],
} as AuthenticatedUser;

describe('OutletsService — create (batas paket)', () => {
  let service: OutletsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [OutletsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(OutletsService);
  });

  it('menolak membuat outlet bila sudah mencapai batas paket', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ maxOutlets: 2 });
    prisma.outlet.count.mockResolvedValue(2); // sudah 2 dari maks 2

    await expect(
      service.create({ name: 'Cabang Baru' } as any, owner),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.outlet.create).not.toHaveBeenCalled();
  });

  it('membuat outlet bila masih di bawah batas', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ maxOutlets: 5 });
    prisma.outlet.count.mockResolvedValue(2);
    prisma.outlet.create.mockResolvedValue({ id: 'outlet-baru', name: 'Cabang Baru' });

    const result = await service.create({ name: 'Cabang Baru' } as any, owner);
    expect(result).toHaveProperty('id', 'outlet-baru');
  });
});
