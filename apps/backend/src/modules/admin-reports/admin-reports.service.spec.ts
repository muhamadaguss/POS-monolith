import { Test } from '@nestjs/testing';
import { AdminReportsService, resolveRange } from './admin-reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import { ReportPeriod } from './dto/platform-report-query.dto';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(AdminReportsService);
  });

  describe('resolveRange', () => {
    it('30d → rentang ~30 hari ke belakang', () => {
      const { from, to } = resolveRange({ period: ReportPeriod.LAST_30D });
      const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      expect(Math.round(days)).toBe(30);
    });

    it('ytd → mulai 1 Januari tahun ini', () => {
      const { from } = resolveRange({ period: ReportPeriod.YTD });
      expect(from.getMonth()).toBe(0);
      expect(from.getDate()).toBe(1);
    });

    it('custom → pakai startDate/endDate', () => {
      const { from, to } = resolveRange({
        period: ReportPeriod.CUSTOM,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });
      expect(from.getFullYear()).toBe(2026);
      expect(to.getMonth()).toBe(2);
    });
  });

  describe('getSummary', () => {
    it('menjumlahkan amount paid/unpaid & hitung tenant per status + MRR', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { amount: '99000', isPaid: true },
        { amount: '299000', isPaid: true },
        { amount: '99000', isPaid: false },
      ]);
      // urutan count: newTenants, total, active, trial, suspended, churned
      prisma.tenant.count
        .mockResolvedValueOnce(4) // newTenants
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // active
        .mockResolvedValueOnce(2) // trial
        .mockResolvedValueOnce(1) // suspended
        .mockResolvedValueOnce(1); // churned
      // computeMrr: tenant ACTIVE
      prisma.tenant.findMany.mockResolvedValue([
        { plan: 'STARTER' },
        { plan: 'GROWTH' },
      ]);

      const res = await service.getSummary({ period: ReportPeriod.LAST_30D });

      expect(res.paidRevenue).toBe(398000);
      expect(res.unpaidRevenue).toBe(99000);
      expect(res.newTenants).toBe(4);
      expect(res.totalTenants).toBe(10);
      expect(res.activeTenants).toBe(6);
      expect(res.churnedTenants).toBe(1);
      expect(res.mrr).toBe(99000 + 299000); // STARTER + GROWTH
    });
  });

  describe('getRevenueTrend', () => {
    it('mengelompokkan pendapatan & tenant baru per bulan', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { amount: '100000', createdAt: new Date('2026-01-10') },
        { amount: '50000', createdAt: new Date('2026-01-20') },
        { amount: '200000', createdAt: new Date('2026-02-05') },
      ]);
      prisma.tenant.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-15') },
        { createdAt: new Date('2026-02-01') },
        { createdAt: new Date('2026-02-25') },
      ]);

      const res = await service.getRevenueTrend({ period: ReportPeriod.YTD });

      expect(res).toHaveLength(2);
      const jan = res.find((r) => r.month === '2026-01')!;
      const feb = res.find((r) => r.month === '2026-02')!;
      expect(jan.paidRevenue).toBe(150000);
      expect(jan.newTenants).toBe(1);
      expect(feb.paidRevenue).toBe(200000);
      expect(feb.newTenants).toBe(2);
      // terurut menaik
      expect(res[0].month < res[1].month).toBe(true);
    });
  });

  describe('getPlanDistribution', () => {
    it('menghitung count + mrr per paket (tenant aktif), termasuk paket dgn 0 tenant', async () => {
      prisma.tenant.groupBy.mockResolvedValue([
        { plan: 'STARTER', _count: { _all: 2 } },
        { plan: 'GROWTH', _count: { _all: 1 } },
      ]);

      const res = await service.getPlanDistribution();

      const starter = res.find((r) => r.plan === 'STARTER')!;
      const growth = res.find((r) => r.plan === 'GROWTH')!;
      const free = res.find((r) => r.plan === 'FREE')!;
      expect(starter.count).toBe(2);
      expect(starter.mrr).toBe(2 * 99000);
      expect(growth.count).toBe(1);
      expect(growth.mrr).toBe(299000);
      expect(free.count).toBe(0); // paket tanpa tenant tetap muncul
      expect(res).toHaveLength(4); // FREE/STARTER/GROWTH/ENTERPRISE
    });
  });

  describe('exportXlsx', () => {
    it('menghasilkan Buffer Excel non-kosong', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.groupBy.mockResolvedValue([]);

      const buf = await service.exportXlsx({ period: ReportPeriod.LAST_30D });
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    });
  });
});
