import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionPlan, TenantStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_CATALOG, PLAN_LIST, PlanDef } from './plan-catalog';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  /** Katalog semua paket yang tersedia. */
  getPlans(): PlanDef[] {
    return PLAN_LIST;
  }

  private async getTenantOrThrow(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    return tenant;
  }

  /** Status langganan saat ini + pemakaian nyata (outlet & staf terpakai). */
  async getSubscription(tenantId: string) {
    const tenant = await this.getTenantOrThrow(tenantId);

    const [outletCount, staffCount] = await Promise.all([
      this.prisma.outlet.count({ where: { tenantId } }),
      this.prisma.user.count({
        where: { tenantId, status: { not: UserStatus.INACTIVE } },
      }),
    ]);

    const planDef = PLAN_CATALOG[tenant.plan];

    return {
      plan: tenant.plan,
      planName: planDef.name,
      price: planDef.price,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      limits: { maxOutlets: tenant.maxOutlets, maxStaff: tenant.maxStaff },
      usage: { outlets: outletCount, staff: staffCount },
    };
  }

  /** Riwayat tagihan tenant (terbaru dulu). */
  async getInvoices(tenantId: string) {
    const subs = await this.prisma.subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return subs.map((s) => ({
      id: s.id,
      plan: s.plan,
      planName: PLAN_CATALOG[s.plan].name,
      amount: Number(s.amount),
      startDate: s.startDate,
      endDate: s.endDate,
      isPaid: s.isPaid,
      paidAt: s.paidAt,
      invoiceRef: s.invoiceRef,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Buat invoice langganan (belum lunas). Owner lalu membayarnya via pay().
   * Guardrail downgrade: tolak bila pemakaian melebihi batas paket tujuan.
   */
  async subscribe(tenantId: string, plan: SubscriptionPlan) {
    const target = PLAN_CATALOG[plan];

    const [outletCount, staffCount] = await Promise.all([
      this.prisma.outlet.count({ where: { tenantId } }),
      this.prisma.user.count({
        where: { tenantId, status: { not: UserStatus.INACTIVE } },
      }),
    ]);

    if (outletCount > target.maxOutlets) {
      throw new BadRequestException(
        `Anda memiliki ${outletCount} outlet, paket ${target.name} hanya mengizinkan ${target.maxOutlets}. Kurangi outlet terlebih dahulu.`,
      );
    }
    if (staffCount > target.maxStaff) {
      throw new BadRequestException(
        `Anda memiliki ${staffCount} staf, paket ${target.name} hanya mengizinkan ${target.maxStaff}. Kurangi staf terlebih dahulu.`,
      );
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1); // siklus 1 bulan

    const sub = await this.prisma.subscription.create({
      data: {
        tenantId,
        plan,
        amount: target.price,
        startDate: now,
        endDate,
        isPaid: target.price === 0, // paket gratis otomatis lunas
        paidAt: target.price === 0 ? now : null,
        invoiceRef: target.price === 0 ? this.makeInvoiceRef() : null,
      },
    });

    // Paket gratis langsung aktif tanpa langkah bayar.
    if (target.price === 0) {
      await this.activatePlan(tenantId, plan);
    }

    return {
      id: sub.id,
      plan: sub.plan,
      planName: target.name,
      amount: Number(sub.amount),
      isPaid: sub.isPaid,
      invoiceRef: sub.invoiceRef,
    };
  }

  /**
   * SIMULASI PEMBAYARAN — tidak ada gateway sungguhan.
   * Titik tunggal yang kelak diganti integrasi Midtrans/Xendit/Stripe + webhook.
   */
  async pay(tenantId: string, invoiceId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id: invoiceId } });
    if (!sub || sub.tenantId !== tenantId) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }
    if (sub.isPaid) {
      throw new BadRequestException('Invoice ini sudah dibayar.');
    }

    const paid = await this.prisma.subscription.update({
      where: { id: invoiceId },
      data: { isPaid: true, paidAt: new Date(), invoiceRef: this.makeInvoiceRef() },
    });

    await this.activatePlan(tenantId, sub.plan);

    return {
      id: paid.id,
      isPaid: paid.isPaid,
      paidAt: paid.paidAt,
      invoiceRef: paid.invoiceRef,
      message: 'Pembayaran (simulasi) berhasil. Paket Anda telah aktif.',
    };
  }

  /** Terapkan paket ke tenant: update plan, batas, dan status → ACTIVE. */
  private async activatePlan(tenantId: string, plan: SubscriptionPlan) {
    const def = PLAN_CATALOG[plan];
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        maxOutlets: def.maxOutlets,
        maxStaff: def.maxStaff,
        status: TenantStatus.ACTIVE,
      },
    });
  }

  private makeInvoiceRef(): string {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${d}-${rand}`;
  }
}
