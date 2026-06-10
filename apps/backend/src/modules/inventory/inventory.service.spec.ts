import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

const owner: AuthenticatedUser = {
  userId: 'owner-1',
  tenantId: 'tenant-1',
  role: Role.TENANT_OWNER,
  currentOutletId: null,
  permissions: ['inventory.transfer'],
} as AuthenticatedUser;

describe('InventoryService — createTransfer', () => {
  let service: InventoryService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(InventoryService);
  });

  it('menolak transfer ke outlet yang sama', async () => {
    await expect(
      service.createTransfer(
        { fromOutletId: 'o1', toOutletId: 'o1', items: [] } as any,
        owner,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('menolak bila outlet asal tidak ditemukan', async () => {
    prisma.outlet.findFirst
      .mockResolvedValueOnce({ id: 'o1' }) // ensureOutletAccess
      .mockResolvedValueOnce(null) // fromOutlet
      .mockResolvedValueOnce({ id: 'o2' }); // toOutlet
    await expect(
      service.createTransfer(
        { fromOutletId: 'o1', toOutletId: 'o2', items: [{ productId: 'p1', quantity: 1 }] } as any,
        owner,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('menolak bila stok di outlet asal tidak cukup', async () => {
    prisma.outlet.findFirst.mockResolvedValue({ id: 'ok', tenantId: 'tenant-1' });
    prisma.inventory.findFirst.mockResolvedValue({ id: 'inv', quantity: new Decimal(2) });

    await expect(
      service.createTransfer(
        {
          fromOutletId: 'o1',
          toOutletId: 'o2',
          items: [{ productId: 'p1', quantity: 5 }],
        } as any,
        owner,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('membuat transfer bila stok cukup', async () => {
    prisma.outlet.findFirst.mockResolvedValue({ id: 'ok', tenantId: 'tenant-1' });
    prisma.inventory.findFirst.mockResolvedValue({ id: 'inv', quantity: new Decimal(10) });
    prisma.stockTransfer.create.mockResolvedValue({ id: 'transfer-1', items: [] });

    const result = await service.createTransfer(
      {
        fromOutletId: 'o1',
        toOutletId: 'o2',
        items: [{ productId: 'p1', quantity: 3 }],
      } as any,
      owner,
    );
    expect(result).toHaveProperty('id', 'transfer-1');
  });
});
