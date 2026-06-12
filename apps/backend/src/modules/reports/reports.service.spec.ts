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

describe('ReportsService — getHourlySales', () => {
  let service: ReportsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReportsService);
    prisma.outlet.findMany.mockResolvedValue([{ id: 'o1' }]);
  });

  it('selalu mengembalikan 24 baris (jam 0–23), kosong = 0', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    const res = await service.getHourlySales(owner, query);
    expect(res.hourly).toHaveLength(24);
    expect(res.hourly.every((h) => h.count === 0)).toBe(true);
    expect(res.hourly[0].hour).toBe(0);
    expect(res.hourly[23].hour).toBe(23);
  });

  it('mengakumulasi count & revenue ke jam yang benar', async () => {
    // dua transaksi jam 9, satu jam 14
    const at = (h: number) => new Date(2026, 5, 11, h, 30, 0);
    prisma.transaction.findMany.mockResolvedValue([
      { createdAt: at(9), totalAmount: new Decimal(10000) },
      { createdAt: at(9), totalAmount: new Decimal(5000) },
      { createdAt: at(14), totalAmount: new Decimal(8000) },
    ]);

    const res = await service.getHourlySales(owner, query);

    expect(res.hourly[9].count).toBe(2);
    expect(res.hourly[9].revenue.toString()).toBe('15000');
    expect(res.hourly[14].count).toBe(1);
    expect(res.hourly[14].revenue.toString()).toBe('8000');
  });

  it('hanya transaksi COMPLETED (filter where)', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    await service.getHourlySales(owner, query);
    const where = prisma.transaction.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('COMPLETED');
  });
});

describe('ReportsService — getSalesByCategory', () => {
  let service: ReportsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReportsService);
    prisma.outlet.findMany.mockResolvedValue([{ id: 'o1' }]);
  });

  it('mengakumulasi revenue & qty per kategori, urut revenue desc', async () => {
    prisma.transactionItem.findMany.mockResolvedValue([
      { quantity: new Decimal(2), subtotal: new Decimal(10000), product: { category: { id: 'c1', name: 'Minuman' } } },
      { quantity: new Decimal(1), subtotal: new Decimal(5000), product: { category: { id: 'c1', name: 'Minuman' } } },
      { quantity: new Decimal(3), subtotal: new Decimal(30000), product: { category: { id: 'c2', name: 'Makanan' } } },
    ]);

    const res = await service.getSalesByCategory(owner, query);

    expect(res.categories).toHaveLength(2);
    // Makanan (30000) di atas Minuman (15000)
    expect(res.categories[0].categoryName).toBe('Makanan');
    expect(res.categories[0].revenue.toString()).toBe('30000');
    expect(res.categories[1].categoryName).toBe('Minuman');
    expect(res.categories[1].revenue.toString()).toBe('15000');
    expect(res.categories[1].quantity.toString()).toBe('3');
  });

  it('produk tanpa kategori → "Tanpa Kategori"', async () => {
    prisma.transactionItem.findMany.mockResolvedValue([
      { quantity: new Decimal(1), subtotal: new Decimal(7000), product: { category: null } },
    ]);

    const res = await service.getSalesByCategory(owner, query);

    expect(res.categories[0].categoryName).toBe('Tanpa Kategori');
    expect(res.categories[0].categoryId).toBeNull();
  });
});
