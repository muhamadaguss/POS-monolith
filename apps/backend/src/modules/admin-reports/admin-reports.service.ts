import { Injectable } from '@nestjs/common';
import { SubscriptionPlan, TenantStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_CATALOG, PLAN_LIST } from '../billing/plan-catalog';
import {
  PlatformReportQueryDto,
  ReportPeriod,
} from './dto/platform-report-query.dto';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PlatformSummary {
  mrr: number;
  paidRevenue: number;
  unpaidRevenue: number;
  newTenants: number;
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  churnedTenants: number;
}

export interface RevenueTrendPoint {
  month: string; // YYYY-MM
  paidRevenue: number;
  newTenants: number;
}

export interface PlanDistributionItem {
  plan: SubscriptionPlan;
  name: string;
  count: number;
  mrr: number;
}

/** Konversi Prisma.Decimal | number | string → number. */
function toNum(
  v: number | string | { toString(): string } | null | undefined,
): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v.toString());
}

/** Resolusi periode laporan → rentang tanggal [from, to]. */
export function resolveRange(query: PlatformReportQueryDto): DateRange {
  const now = new Date();
  const to =
    query.period === ReportPeriod.CUSTOM && query.endDate
      ? new Date(query.endDate)
      : now;

  let from: Date;
  switch (query.period) {
    case ReportPeriod.CUSTOM:
      from = query.startDate
        ? new Date(query.startDate)
        : new Date(now.getFullYear(), 0, 1);
      break;
    case ReportPeriod.YTD:
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case ReportPeriod.LAST_90D:
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case ReportPeriod.LAST_30D:
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }
  return { from, to };
}

@Injectable()
export class AdminReportsService {
  constructor(private prisma: PrismaService) {}

  /** MRR = jumlah harga paket dari tenant berstatus ACTIVE (selaras admin-tenants getStats). */
  private async computeMrr(): Promise<number> {
    const active = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      select: { plan: true },
    });
    return active.reduce((sum, t) => sum + PLAN_CATALOG[t.plan].price, 0);
  }

  async getSummary(query: PlatformReportQueryDto): Promise<PlatformSummary> {
    const { from, to } = resolveRange(query);

    const [
      subs,
      newTenants,
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      churnedTenants,
      mrr,
    ] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { amount: true, isPaid: true },
      }),
      this.prisma.tenant.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.TRIAL } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.CANCELLED } }),
      this.computeMrr(),
    ]);

    let paidRevenue = 0;
    let unpaidRevenue = 0;
    for (const s of subs) {
      const amt = toNum(s.amount);
      if (s.isPaid) paidRevenue += amt;
      else unpaidRevenue += amt;
    }

    return {
      mrr,
      paidRevenue,
      unpaidRevenue,
      newTenants,
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      churnedTenants,
    };
  }

  async getRevenueTrend(
    query: PlatformReportQueryDto,
  ): Promise<RevenueTrendPoint[]> {
    const { from, to } = resolveRange(query);

    const [subs, tenants] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { isPaid: true, createdAt: { gte: from, lte: to } },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.tenant.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      }),
    ]);

    const buckets = new Map<string, RevenueTrendPoint>();
    const keyOf = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ensure = (k: string) => {
      let b = buckets.get(k);
      if (!b) {
        b = { month: k, paidRevenue: 0, newTenants: 0 };
        buckets.set(k, b);
      }
      return b;
    };

    for (const s of subs)
      ensure(keyOf(s.createdAt)).paidRevenue += toNum(s.amount);
    for (const t of tenants) ensure(keyOf(t.createdAt)).newTenants += 1;

    return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
  }

  async getPlanDistribution(): Promise<PlanDistributionItem[]> {
    const grouped = await this.prisma.tenant.groupBy({
      by: ['plan'],
      where: { status: TenantStatus.ACTIVE },
      _count: { _all: true },
    });
    const countByPlan = new Map<SubscriptionPlan, number>();
    for (const g of grouped) countByPlan.set(g.plan, g._count._all);

    return PLAN_LIST.map((def) => {
      const count = countByPlan.get(def.plan) ?? 0;
      return { plan: def.plan, name: def.name, count, mrr: count * def.price };
    });
  }

  /** Bangun workbook Excel berisi 3 sheet: Ringkasan, Tren Bulanan, Distribusi Paket. */
  async exportXlsx(query: PlatformReportQueryDto): Promise<Buffer> {
    const [summary, trend, dist] = await Promise.all([
      this.getSummary(query),
      this.getRevenueTrend(query),
      this.getPlanDistribution(),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Kasirku';
    wb.created = new Date();

    const s1 = wb.addWorksheet('Ringkasan');
    s1.columns = [
      { header: 'Metrik', key: 'k', width: 28 },
      { header: 'Nilai', key: 'v', width: 20 },
    ];
    s1.addRows([
      { k: 'MRR (Rp)', v: summary.mrr },
      { k: 'Pendapatan Lunas (Rp)', v: summary.paidRevenue },
      { k: 'Pendapatan Belum Bayar (Rp)', v: summary.unpaidRevenue },
      { k: 'Tenant Baru', v: summary.newTenants },
      { k: 'Total Tenant', v: summary.totalTenants },
      { k: 'Tenant Aktif', v: summary.activeTenants },
      { k: 'Tenant Trial', v: summary.trialTenants },
      { k: 'Tenant Suspended', v: summary.suspendedTenants },
      { k: 'Tenant Churn (Cancelled)', v: summary.churnedTenants },
    ]);
    s1.getRow(1).font = { bold: true };

    const s2 = wb.addWorksheet('Tren Bulanan');
    s2.columns = [
      { header: 'Bulan', key: 'month', width: 14 },
      { header: 'Pendapatan Lunas (Rp)', key: 'paidRevenue', width: 24 },
      { header: 'Tenant Baru', key: 'newTenants', width: 16 },
    ];
    s2.addRows(trend);
    s2.getRow(1).font = { bold: true };

    const s3 = wb.addWorksheet('Distribusi Paket');
    s3.columns = [
      { header: 'Paket', key: 'name', width: 18 },
      { header: 'Jumlah Tenant Aktif', key: 'count', width: 22 },
      { header: 'MRR (Rp)', key: 'mrr', width: 18 },
    ];
    s3.addRows(dist.map((d) => ({ name: d.name, count: d.count, mrr: d.mrr })));
    s3.getRow(1).font = { bold: true };

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
