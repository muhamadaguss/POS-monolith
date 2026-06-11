import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Role, ShiftStatus } from '@prisma/client';
import { ShiftsService } from './shifts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

const cashier: AuthenticatedUser = {
  userId: 'cashier-1',
  tenantId: 'tenant-1',
  role: Role.CASHIER,
  currentOutletId: 'outlet-1',
  permissions: ['shift.own'],
} as AuthenticatedUser;

const owner: AuthenticatedUser = {
  userId: 'owner-1',
  tenantId: 'tenant-1',
  role: Role.TENANT_OWNER,
  currentOutletId: null,
  permissions: ['shift.manage'],
} as AuthenticatedUser;

describe('ShiftsService', () => {
  let service: ShiftsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [ShiftsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ShiftsService);

    prisma.outlet.findFirst.mockResolvedValue({ id: 'outlet-1', tenantId: 'tenant-1' });
  });

  describe('openShift', () => {
    it('menolak bila masih ada shift OPEN di outlet', async () => {
      prisma.shift.findFirst.mockResolvedValue({ id: 'existing', status: ShiftStatus.OPEN });
      await expect(
        service.openShift({ outletId: 'outlet-1', openingCash: 100000 }, cashier),
      ).rejects.toThrow(ConflictException);
    });

    it('menolak kasir membuka shift di outlet lain', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);
      await expect(
        service.openShift({ outletId: 'outlet-2', openingCash: 100000 }, cashier),
      ).rejects.toThrow();
    });

    it('membuat shift baru bila tidak ada yang OPEN', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);
      prisma.shift.create.mockResolvedValue({ id: 'new-shift', status: ShiftStatus.OPEN });
      const result = await service.openShift({ outletId: 'outlet-1', openingCash: 100000 }, cashier);
      expect(result).toHaveProperty('id', 'new-shift');
      expect(prisma.shift.create).toHaveBeenCalled();
    });
  });

  describe('closeShift', () => {
    const openShift = {
      id: 'shift-1',
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      openedById: 'cashier-1',
      openingCash: new Decimal(100000),
      status: ShiftStatus.OPEN,
      notes: null,
    };

    beforeEach(() => {
      // aggregate dipanggil 3x (cashIn, refund, summary)
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amountPaid: new Decimal(150000), changeAmount: new Decimal(20000) } })
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(0) } })
        .mockResolvedValueOnce({ _count: { id: 3 }, _sum: { totalAmount: new Decimal(130000) } });
      prisma.shift.update.mockImplementation((args: any) =>
        Promise.resolve({ id: 'shift-1', ...args.data }),
      );
    });

    it('menghitung expectedCash & cashDifference dengan benar', async () => {
      prisma.shift.findFirst.mockResolvedValue(openShift);

      // expectedCash = opening(100k) + cashIn(150k-20k=130k) - refund(0) = 230k
      // closingCash 250k → difference +20k
      const result = await service.closeShift('shift-1', { closingCash: 250000 }, cashier);

      expect(result.summary.expectedCash).toEqual(new Decimal(230000));
      expect(result.summary.cashDifference).toEqual(new Decimal(20000));
      expect(result.summary.totalCashIn).toEqual(new Decimal(130000));
    });

    it('refund tunai mengurangi expectedCash', async () => {
      prisma.shift.findFirst.mockResolvedValue(openShift);
      // override mock urutan: cashIn, refund(50k), summary
      prisma.transaction.aggregate.mockReset();
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amountPaid: new Decimal(150000), changeAmount: new Decimal(20000) } })
        .mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(50000) } }) // refund tunai 50k
        .mockResolvedValueOnce({ _count: { id: 2 }, _sum: { totalAmount: new Decimal(80000) } });

      // expectedCash = 100k + 130k - 50k = 180k
      const result = await service.closeShift('shift-1', { closingCash: 180000 }, cashier);

      expect(result.summary.totalCashRefund).toEqual(new Decimal(50000));
      expect(result.summary.expectedCash).toEqual(new Decimal(180000));
      expect(result.summary.cashDifference).toEqual(new Decimal(0));
    });

    it('memfilter kas masuk = COMPLETED+REFUNDED, dan kas keluar = REFUNDED', async () => {
      prisma.shift.findFirst.mockResolvedValue(openShift);
      await service.closeShift('shift-1', { closingCash: 230000 }, cashier);

      // aggregate ke-1 = kas masuk: termasuk transaksi yang kemudian di-refund
      const cashInCall = prisma.transaction.aggregate.mock.calls[0][0];
      expect(cashInCall.where.status).toEqual({ in: ['COMPLETED', 'REFUNDED'] });

      // aggregate ke-2 = kas keluar (refund): hanya REFUNDED, bukan VOIDED
      const refundCall = prisma.transaction.aggregate.mock.calls[1][0];
      expect(refundCall.where.status).toBe('REFUNDED');
    });

    it('menolak menutup shift yang sudah CLOSED', async () => {
      prisma.shift.findFirst.mockResolvedValue({ ...openShift, status: ShiftStatus.CLOSED });
      await expect(
        service.closeShift('shift-1', { closingCash: 100000 }, cashier),
      ).rejects.toThrow(ConflictException);
    });

    it('menolak kasir menutup shift milik kasir lain', async () => {
      prisma.shift.findFirst.mockResolvedValue({ ...openShift, openedById: 'other-cashier' });
      await expect(
        service.closeShift('shift-1', { closingCash: 100000 }, cashier),
      ).rejects.toThrow(ForbiddenException);
    });

    it('melempar NotFound bila shift tak ada', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);
      await expect(
        service.closeShift('nope', { closingCash: 100000 }, cashier),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      // Owner: resolveAllowedOutlets → outlet.findMany
      prisma.outlet.findMany.mockResolvedValue([{ id: 'outlet-1' }, { id: 'outlet-2' }]);
    });

    it('mengagregasi total shift, total selisih kas, dan rata-rata durasi (CLOSED)', async () => {
      prisma.shift.count.mockResolvedValue(3);
      // dua shift CLOSED: durasi 60m & 120m → avg 90m; selisih -5000 + 2000 = -3000
      prisma.shift.findMany.mockResolvedValue([
        {
          openingCash: new Decimal(100000),
          closingCash: new Decimal(95000),
          cashDifference: new Decimal(-5000),
          openedAt: new Date('2026-06-11T00:00:00.000Z'),
          closedAt: new Date('2026-06-11T01:00:00.000Z'),
        },
        {
          openingCash: new Decimal(100000),
          closingCash: new Decimal(102000),
          cashDifference: new Decimal(2000),
          openedAt: new Date('2026-06-11T03:00:00.000Z'),
          closedAt: new Date('2026-06-11T05:00:00.000Z'),
        },
      ]);

      const stats = await service.getStats(owner, {});

      expect(stats.totalShifts).toBe(3);
      expect(stats.totalCashDifference).toBe('-3000');
      expect(stats.avgDurationMinutes).toBe(90);
    });

    it('avgDurationMinutes = 0 bila tak ada shift CLOSED', async () => {
      prisma.shift.count.mockResolvedValue(1);
      prisma.shift.findMany.mockResolvedValue([]); // tak ada CLOSED
      const stats = await service.getStats(owner, {});
      expect(stats.avgDurationMinutes).toBe(0);
      expect(stats.totalCashDifference).toBe('0');
    });

    it('hanya menghitung shift CLOSED untuk selisih (query filter status CLOSED)', async () => {
      prisma.shift.count.mockResolvedValue(5);
      prisma.shift.findMany.mockResolvedValue([]);
      await service.getStats(owner, {});
      const findManyArg = prisma.shift.findMany.mock.calls[0][0];
      expect(findManyArg.where.status).toBe(ShiftStatus.CLOSED);
    });
  });

  describe('findAll — search', () => {
    beforeEach(() => {
      prisma.outlet.findMany.mockResolvedValue([{ id: 'outlet-1' }]);
      prisma.shift.findMany.mockResolvedValue([]);
      prisma.shift.count.mockResolvedValue(0);
    });

    it('search membangun klausa OR pada nama kasir & outlet', async () => {
      await service.findAll(owner, { search: 'Andi' });
      const arg = prisma.shift.findMany.mock.calls[0][0];
      expect(arg.where.OR).toEqual([
        { openedBy: { name: { contains: 'Andi', mode: 'insensitive' } } },
        { outlet: { name: { contains: 'Andi', mode: 'insensitive' } } },
      ]);
    });

    it('tanpa search: tak ada klausa OR', async () => {
      await service.findAll(owner, {});
      const arg = prisma.shift.findMany.mock.calls[0][0];
      expect(arg.where.OR).toBeUndefined();
    });
  });

  describe('requireActiveShift', () => {
    it('mengembalikan id shift aktif', async () => {
      prisma.shift.findFirst.mockResolvedValue({ id: 'shift-1' });
      await expect(service.requireActiveShift('outlet-1', cashier)).resolves.toBe('shift-1');
    });

    it('melempar bila tidak ada shift aktif', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);
      await expect(service.requireActiveShift('outlet-1', cashier)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
