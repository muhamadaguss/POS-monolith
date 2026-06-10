import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubscriptionPlan, TenantStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_CATALOG } from '../billing/plan-catalog';
import { TenantQueryDto } from './dto/admin-tenant.dto';

@Injectable()
export class AdminTenantsService {
  constructor(private prisma: PrismaService) {}

  /** Daftar SEMUA tenant lintas-platform (khusus Super Admin). */
  async findAll(query: TenantQueryDto) {
    const { search, status, plan, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {
      ...(status && { status }),
      ...(plan && { plan }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: { _count: { select: { outlets: true, users: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      items: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        email: t.email,
        plan: t.plan,
        status: t.status,
        maxOutlets: t.maxOutlets,
        maxStaff: t.maxStaff,
        outletCount: t._count.outlets,
        staffCount: t._count.users,
        trialEndsAt: t.trialEndsAt,
        createdAt: t.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Detail satu tenant + statistik + riwayat langganan. */
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { outlets: true, users: true, products: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    const [activeStaff, transactionCount] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId: id, status: { not: UserStatus.INACTIVE } },
      }),
      this.prisma.transaction.count({ where: { tenantId: id } }),
    ]);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      phone: tenant.phone,
      billingEmail: tenant.billingEmail,
      plan: tenant.plan,
      planName: PLAN_CATALOG[tenant.plan].name,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      limits: { maxOutlets: tenant.maxOutlets, maxStaff: tenant.maxStaff },
      stats: {
        outlets: tenant._count.outlets,
        staff: activeStaff,
        products: tenant._count.products,
        transactions: transactionCount,
      },
      subscriptions: tenant.subscriptions.map((s) => ({
        id: s.id,
        plan: s.plan,
        planName: PLAN_CATALOG[s.plan].name,
        amount: Number(s.amount),
        isPaid: s.isPaid,
        paidAt: s.paidAt,
        invoiceRef: s.invoiceRef,
        createdAt: s.createdAt,
      })),
      createdAt: tenant.createdAt,
    };
  }

  /** Ubah status tenant (ACTIVE/SUSPENDED/TRIAL/CANCELLED). */
  async updateStatus(id: string, status: TenantStatus) {
    await this.ensureExists(id);
    await this.prisma.tenant.update({ where: { id }, data: { status } });
    return { id, status };
  }

  /**
   * Ganti paket tenant. Super Admin BOLEH override walau pemakaian melebihi
   * batas paket baru — kita kembalikan warning agar UI bisa menampilkannya,
   * tapi perubahan tetap diterapkan (otoritas tertinggi).
   */
  async updatePlan(id: string, plan: SubscriptionPlan) {
    await this.ensureExists(id);
    const def = PLAN_CATALOG[plan];

    const [outletCount, staffCount] = await Promise.all([
      this.prisma.outlet.count({ where: { tenantId: id } }),
      this.prisma.user.count({
        where: { tenantId: id, status: { not: UserStatus.INACTIVE } },
      }),
    ]);

    const warnings: string[] = [];
    if (outletCount > def.maxOutlets) {
      warnings.push(
        `Tenant punya ${outletCount} outlet, melebihi batas paket ${def.name} (${def.maxOutlets}).`,
      );
    }
    if (staffCount > def.maxStaff) {
      warnings.push(
        `Tenant punya ${staffCount} staf, melebihi batas paket ${def.name} (${def.maxStaff}).`,
      );
    }

    await this.prisma.tenant.update({
      where: { id },
      data: { plan, maxOutlets: def.maxOutlets, maxStaff: def.maxStaff },
    });

    return { id, plan, planName: def.name, warnings };
  }

  /** Statistik ringkas seluruh platform (untuk KPI). */
  async getStats() {
    const [total, active, trial, suspended, cancelled] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.TRIAL } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.prisma.tenant.count({ where: { status: TenantStatus.CANCELLED } }),
    ]);

    // Estimasi MRR: jumlah harga paket dari tenant berstatus ACTIVE.
    const activeTenants = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      select: { plan: true },
    });
    const mrr = activeTenants.reduce((sum, t) => sum + PLAN_CATALOG[t.plan].price, 0);

    return { total, active, trial, suspended, cancelled, mrr };
  }

  private async ensureExists(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!t) throw new NotFoundException('Tenant tidak ditemukan');
  }
}
