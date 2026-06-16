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

describe('InventoryService — getTransfers', () => {
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

  it('mengembalikan items + meta paginasi', async () => {
    prisma.outlet.findMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }]);
    prisma.stockTransfer.findMany.mockResolvedValue([
      { id: 't1', status: 'PENDING', items: [] },
    ]);
    prisma.stockTransfer.count.mockResolvedValue(1);

    const result = await service.getTransfers(owner, { page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('menerapkan filter status ke where', async () => {
    prisma.outlet.findMany.mockResolvedValue([{ id: 'o1' }]);
    prisma.stockTransfer.findMany.mockResolvedValue([]);
    prisma.stockTransfer.count.mockResolvedValue(0);

    await service.getTransfers(owner, { status: 'APPROVED' as any });

    const arg = prisma.stockTransfer.findMany.mock.calls[0][0];
    expect(arg.where.status).toBe('APPROVED');
    expect(arg.include.requestedBy.select.role).toBe(true);
  });

  it('membangun OR pencarian saat ada search', async () => {
    prisma.outlet.findMany.mockResolvedValue([{ id: 'o1' }]);
    prisma.stockTransfer.findMany.mockResolvedValue([]);
    prisma.stockTransfer.count.mockResolvedValue(0);

    await service.getTransfers(owner, { search: 'bekasi' });

    const arg = prisma.stockTransfer.findMany.mock.calls[0][0];
    expect(Array.isArray(arg.where.AND)).toBe(true);
    expect(arg.where.AND[0].OR.length).toBeGreaterThan(0);
  });
});
