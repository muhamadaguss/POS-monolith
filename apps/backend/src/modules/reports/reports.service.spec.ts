import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import type { SalesReportQueryDto } from './dto/report-query.dto';

const cashier = (currentOutletId: string | null): AuthenticatedUser =>
  ({
    userId: 'cashier-1',
    email: 'cashier@toko.id',
    tenantId: 'tenant-1',
    role: Role.CASHIER,
    currentOutletId,
    permissions: [],
  }) as AuthenticatedUser;

const owner: AuthenticatedUser = {
  userId: 'owner-1',
  email: 'owner@toko.id',
  tenantId: 'tenant-1',
  role: Role.TENANT_OWNER,
  currentOutletId: null,
  permissions: [],
} as AuthenticatedUser;

/** Stub aggregate/groupBy agar getSalesSummary jalan sampai selesai. */
function stubAggregates(prisma: MockPrisma) {
  prisma.transaction.aggregate.mockResolvedValue({
    _count: { id: 0 },
    _sum: {
      subtotal: new Decimal(0),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(0),
      totalAmount: new Decimal(0),
    },
  });
  prisma.transaction.count.mockResolvedValue(0);
  prisma.transaction.groupBy.mockResolvedValue([]);
  // getDailyBreakdown memakai findMany pada transaction
  prisma.transaction.findMany.mockResolvedValue([]);
}

const query: SalesReportQueryDto = {} as SalesReportQueryDto;

describe('ReportsService — RBAC outlet scoping (getSalesSummary)', () => {
  let service: ReportsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReportsService);
    stubAggregates(prisma);
  });

  it('CASHIER tanpa outlet aktif → ForbiddenException', async () => {
    await expect(service.getSalesSummary(cashier(null), query)).rejects.toThrow(ForbiddenException);
  });

  it('CASHIER meminta outlet lain → ForbiddenException', async () => {
    await expect(
      service.getSalesSummary(cashier('outlet-1'), { outletId: 'outlet-LAIN' } as SalesReportQueryDto),
    ).rejects.toThrow(ForbiddenException);
  });

  it('CASHIER valid → query dibatasi ke outlet aktifnya saja', async () => {
    await service.getSalesSummary(cashier('outlet-1'), query);

    const where = prisma.transaction.aggregate.mock.calls[0][0].where;
    expect(where.outletId).toEqual({ in: ['outlet-1'] });
    expect(where.tenantId).toBe('tenant-1');
  });

  it('OWNER tanpa outletId → mencakup semua outlet milik tenant', async () => {
    prisma.outlet.findMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }]);

    await service.getSalesSummary(owner, query);

    const where = prisma.transaction.aggregate.mock.calls[0][0].where;
    expect(where.outletId).toEqual({ in: ['o1', 'o2'] });
  });
});
