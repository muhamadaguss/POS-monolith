import { Injectable, ForbiddenException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SalesReportQueryDto,
  TopProductsQueryDto,
  ShiftReportQueryDto,
  ReportPeriod,
} from './dto/report-query.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Decimal } from '@prisma/client/runtime/library';
import { Role, TransactionStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ---- Laporan Penjualan ----

  async getSalesSummary(currentUser: AuthenticatedUser, query: SalesReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query.period, query.startDate, query.endDate);
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, query.outletId);

    const where = {
      tenantId: currentUser.tenantId!,
      outletId: { in: allowedOutletIds },
      status: TransactionStatus.COMPLETED,
      createdAt: { gte: startDate, lte: endDate },
    };

    // Aggregate utama
    const [aggregate, voidedCount, paymentBreakdown, dailyBreakdown] = await Promise.all([
      this.prisma.transaction.aggregate({
        where,
        _count: { id: true },
        _sum: { subtotal: true, discountAmount: true, taxAmount: true, totalAmount: true },
      }),

      // Jumlah void di periode yang sama
      this.prisma.transaction.count({
        where: {
          tenantId: currentUser.tenantId!,
          outletId: { in: allowedOutletIds },
          status: TransactionStatus.VOIDED,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Breakdown per payment method
      this.prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // Breakdown penjualan harian (untuk grafik)
      this.getDailyBreakdown(allowedOutletIds, startDate, endDate, currentUser.tenantId!),
    ]);

    const totalTransactions = aggregate._count?.id ?? 0;
    const totalRevenue = aggregate._sum?.totalAmount ?? new Decimal(0);
    const totalDiscount = aggregate._sum?.discountAmount ?? new Decimal(0);
    const totalTax = aggregate._sum?.taxAmount ?? new Decimal(0);
    const totalSubtotal = aggregate._sum?.subtotal ?? new Decimal(0);
    const avgTransactionValue =
      totalTransactions > 0
        ? totalRevenue.dividedBy(totalTransactions).toDecimalPlaces(2)
        : new Decimal(0);

    return {
      period: { startDate, endDate, type: query.period ?? ReportPeriod.DAILY },
      outlets: allowedOutletIds,
      summary: {
        totalTransactions,
        voidedTransactions: voidedCount,
        totalRevenue,
        totalSubtotal,
        totalDiscount,
        totalTax,
        avgTransactionValue,
      },
      paymentBreakdown: paymentBreakdown.map((p) => ({
        paymentMethod: p.paymentMethod,
        count: p._count.id,
        total: p._sum.totalAmount ?? new Decimal(0),
      })),
      dailyBreakdown,
    };
  }

  // ---- Top Produk ----

  async getTopProducts(currentUser: AuthenticatedUser, query: TopProductsQueryDto) {
    const limit = query.limit ?? 10;
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, query.outletId);

    const startDate = query.startDate ? new Date(query.startDate) : this.startOfMonth();
    const endDate = query.endDate ? new Date(query.endDate + 'T23:59:59.999Z') : new Date();

    // Ambil semua item dari transaksi COMPLETED di periode ini
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          tenantId: currentUser.tenantId!,
          outletId: { in: allowedOutletIds },
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        productId: true,
        variantId: true,
        productName: true,
        variantName: true,
        sku: true,
        quantity: true,
        subtotal: true,
        unitPrice: true,
        costPrice: true,
      },
    });

    // Akumulasi per produk+varian
    const productMap = new Map<
      string,
      {
        productId: string;
        variantId: string | null;
        productName: string;
        variantName: string | null;
        sku: string;
        totalQuantity: Decimal;
        totalRevenue: Decimal;
        totalCost: Decimal;
        totalProfit: Decimal;
        transactionCount: number;
      }
    >();

    for (const item of items) {
      const key = `${item.productId}::${item.variantId ?? ''}`;
      const existing = productMap.get(key);
      const cost = item.costPrice.times(item.quantity);
      const profit = item.subtotal.minus(cost);

      if (existing) {
        existing.totalQuantity = existing.totalQuantity.plus(item.quantity);
        existing.totalRevenue = existing.totalRevenue.plus(item.subtotal);
        existing.totalCost = existing.totalCost.plus(cost);
        existing.totalProfit = existing.totalProfit.plus(profit);
        existing.transactionCount += 1;
      } else {
        productMap.set(key, {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          totalQuantity: item.quantity,
          totalRevenue: item.subtotal,
          totalCost: cost,
          totalProfit: profit,
          transactionCount: 1,
        });
      }
    }

    // Sort by revenue desc, ambil top N
    const sorted = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue.minus(a.totalRevenue).toNumber())
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        ...p,
        marginPercent:
          p.totalRevenue.isZero()
            ? new Decimal(0)
            : p.totalProfit.dividedBy(p.totalRevenue).times(100).toDecimalPlaces(2),
      }));

    // Item transaksi adalah snapshot — tak menyimpan imageUrl. Ambil gambar produk
    // terkini dari tabel Product untuk top-N saja (1 query). Frontend memakai
    // gambar bila ada, jika null/kosong fallback ke avatar inisial.
    const productImages = sorted.length
      ? await this.prisma.product.findMany({
          where: { id: { in: sorted.map((p) => p.productId) } },
          select: { id: true, imageUrl: true },
        })
      : [];
    const imageById = new Map(productImages.map((p) => [p.id, p.imageUrl]));

    const topProducts = sorted.map((p) => ({
      ...p,
      imageUrl: imageById.get(p.productId) ?? null,
    }));

    return {
      period: { startDate, endDate },
      outlets: allowedOutletIds,
      topProducts,
    };
  }

  // ---- Rekap Shift ----

  async getShiftSummary(currentUser: AuthenticatedUser, query: ShiftReportQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, query.outletId);

    const startDate = query.startDate ? new Date(query.startDate) : this.startOfMonth();
    const endDate = query.endDate ? new Date(query.endDate + 'T23:59:59.999Z') : new Date();

    const where = {
      tenantId: currentUser.tenantId!,
      outletId: { in: allowedOutletIds },
      openedAt: { gte: startDate, lte: endDate },
    };

    const [shifts, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true } },
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
          _count: { select: { transactions: true } },
        },
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shift.count({ where }),
    ]);

    // Untuk setiap shift, hitung total penjualan
    const shiftIds = shifts.map((s) => s.id);
    const salesByShift = await this.prisma.transaction.groupBy({
      by: ['shiftId'],
      where: {
        shiftId: { in: shiftIds },
        status: TransactionStatus.COMPLETED,
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const salesMap = new Map(
      salesByShift.map((s) => [
        s.shiftId,
        { total: s._sum.totalAmount ?? new Decimal(0), count: s._count.id },
      ]),
    );

    const items = shifts.map((shift) => {
      const sales = salesMap.get(shift.id);
      return {
        ...shift,
        salesTotal: sales?.total ?? new Decimal(0),
        salesCount: sales?.count ?? 0,
      };
    });

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---- Penjualan per Jam (0–23) ----

  /**
   * Distribusi penjualan per jam untuk mengetahui jam ramai vs sepi.
   * Selalu mengembalikan 24 baris (jam 0–23); jam tanpa transaksi diisi 0.
   * Group dilakukan di aplikasi (konsisten dgn getDailyBreakdown).
   */
  async getHourlySales(currentUser: AuthenticatedUser, query: SalesReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query.period, query.startDate, query.endDate);
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, query.outletId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenantId: currentUser.tenantId!,
        outletId: { in: allowedOutletIds },
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, totalAmount: true },
    });

    // Inisialisasi 24 jam dengan nilai 0.
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      revenue: new Decimal(0),
    }));

    for (const trx of transactions) {
      const h = trx.createdAt.getHours();
      hours[h].count += 1;
      hours[h].revenue = hours[h].revenue.plus(trx.totalAmount);
    }

    return {
      period: { startDate, endDate, type: query.period ?? ReportPeriod.DAILY },
      hourly: hours,
    };
  }

  // ---- Penjualan per Kategori ----

  /**
   * Kontribusi penjualan per kategori produk. Kategori diambil dari relasi
   * product.category SAAT INI (TransactionItem tidak menyimpan snapshot
   * kategori). Produk tanpa kategori dikelompokkan sebagai "Tanpa Kategori".
   */
  async getSalesByCategory(currentUser: AuthenticatedUser, query: SalesReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query.period, query.startDate, query.endDate);
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, query.outletId);

    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          tenantId: currentUser.tenantId!,
          outletId: { in: allowedOutletIds },
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        quantity: true,
        subtotal: true,
        product: { select: { category: { select: { id: true, name: true } } } },
      },
    });

    const NO_CATEGORY = '__none__';
    const map = new Map<
      string,
      { categoryId: string | null; categoryName: string; quantity: Decimal; revenue: Decimal }
    >();

    for (const item of items) {
      const cat = item.product?.category ?? null;
      const key = cat?.id ?? NO_CATEGORY;
      const existing = map.get(key);
      if (existing) {
        existing.quantity = existing.quantity.plus(item.quantity);
        existing.revenue = existing.revenue.plus(item.subtotal);
      } else {
        map.set(key, {
          categoryId: cat?.id ?? null,
          categoryName: cat?.name ?? 'Tanpa Kategori',
          quantity: new Decimal(item.quantity),
          revenue: new Decimal(item.subtotal),
        });
      }
    }

    const categories = Array.from(map.values()).sort((a, b) =>
      b.revenue.comparedTo(a.revenue),
    );

    return {
      period: { startDate, endDate, type: query.period ?? ReportPeriod.DAILY },
      categories,
    };
  }

  // ---- Perbandingan antar Outlet ----

  /**
   * Agregat penjualan per outlet untuk perbandingan antar cabang.
   * Revenue & jumlah transaksi dari Transaction; profit dari item
   * (subtotal − costPrice×qty). Outlet tanpa transaksi tetap muncul (nilai 0).
   */
  async getSalesByOutlet(currentUser: AuthenticatedUser, query: SalesReportQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query.period, query.startDate, query.endDate);
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, query.outletId);

    const outlets = await this.prisma.outlet.findMany({
      where: { id: { in: allowedOutletIds }, tenantId: currentUser.tenantId! },
      select: { id: true, name: true },
    });

    const txnWhere = {
      tenantId: currentUser.tenantId!,
      status: TransactionStatus.COMPLETED,
      createdAt: { gte: startDate, lte: endDate },
    };

    // Revenue & jumlah transaksi per outlet (DB groupBy).
    const revenueByOutlet = await this.prisma.transaction.groupBy({
      by: ['outletId'],
      where: { ...txnWhere, outletId: { in: allowedOutletIds } },
      _count: { id: true },
      _sum: { totalAmount: true },
    });
    const revMap = new Map(
      revenueByOutlet.map((r) => [
        r.outletId,
        { revenue: r._sum.totalAmount ?? new Decimal(0), count: r._count.id },
      ]),
    );

    // Profit per outlet dari item (subtotal − cost×qty).
    const items = await this.prisma.transactionItem.findMany({
      where: { transaction: { ...txnWhere, outletId: { in: allowedOutletIds } } },
      select: {
        quantity: true,
        subtotal: true,
        costPrice: true,
        transaction: { select: { outletId: true } },
      },
    });
    const profitMap = new Map<string, Decimal>();
    for (const item of items) {
      const oid = item.transaction.outletId;
      const profit = item.subtotal.minus(item.costPrice.times(item.quantity));
      profitMap.set(oid, (profitMap.get(oid) ?? new Decimal(0)).plus(profit));
    }

    const result = outlets
      .map((o) => {
        const rev = revMap.get(o.id);
        return {
          outletId: o.id,
          outletName: o.name,
          revenue: rev?.revenue ?? new Decimal(0),
          transactions: rev?.count ?? 0,
          profit: profitMap.get(o.id) ?? new Decimal(0),
        };
      })
      .sort((a, b) => b.revenue.comparedTo(a.revenue));

    return {
      period: { startDate, endDate, type: query.period ?? ReportPeriod.DAILY },
      outlets: result,
    };
  }

  // ---- Export Excel (.xlsx) Penjualan ----

  async exportSalesXlsx(
    currentUser: AuthenticatedUser,
    query: SalesReportQueryDto,
  ): Promise<Buffer> {
    const { startDate, endDate } = this.resolveDateRange(query.period, query.startDate, query.endDate);
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, query.outletId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenantId: currentUser.tenantId!,
        outletId: { in: allowedOutletIds },
        status: { in: [TransactionStatus.COMPLETED, TransactionStatus.VOIDED] },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        outlet: { select: { name: true } },
        cashier: { select: { name: true } },
        items: {
          select: {
            productName: true,
            variantName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kasirku';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Penjualan');

    sheet.columns = [
      { header: 'No Struk', key: 'receipt', width: 24 },
      { header: 'Tanggal', key: 'date', width: 20 },
      { header: 'Outlet', key: 'outlet', width: 22 },
      { header: 'Kasir', key: 'cashier', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Metode Bayar', key: 'method', width: 14 },
      { header: 'Produk', key: 'product', width: 28 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Harga Satuan', key: 'unitPrice', width: 16 },
      { header: 'Subtotal Item', key: 'subtotal', width: 16 },
      { header: 'Diskon Transaksi', key: 'discount', width: 18 },
      { header: 'Pajak', key: 'tax', width: 14 },
      { header: 'Total Transaksi', key: 'total', width: 18 },
    ];

    // Style baris header: tebal + latar hijau + teks putih.
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 20;

    const MONEY_FMT = '#,##0';

    for (const trx of transactions) {
      const items = trx.items.length > 0 ? trx.items : [null];
      items.forEach((item, idx) => {
        const first = idx === 0;
        const productLabel = item
          ? item.variantName
            ? `${item.productName} (${item.variantName})`
            : item.productName
          : '';
        sheet.addRow({
          receipt: first ? trx.receiptNumber : '',
          date: first ? trx.createdAt : '',
          outlet: first ? trx.outlet.name : '',
          cashier: first ? trx.cashier.name : '',
          status: first ? trx.status : '',
          method: first ? trx.paymentMethod : '',
          product: productLabel,
          sku: item?.sku ?? '',
          qty: item ? Number(item.quantity) : '',
          unitPrice: item ? Number(item.unitPrice) : '',
          subtotal: item ? Number(item.subtotal) : '',
          discount: first ? Number(trx.discountAmount) : '',
          tax: first ? Number(trx.taxAmount) : '',
          total: first ? Number(trx.totalAmount) : '',
        });
      });
    }

    // Format kolom angka & tanggal.
    ['unitPrice', 'subtotal', 'discount', 'tax', 'total'].forEach((key) => {
      sheet.getColumn(key).numFmt = MONEY_FMT;
    });
    sheet.getColumn('date').numFmt = 'yyyy-mm-dd hh:mm';
    sheet.views = [{ state: 'frozen', ySplit: 1 }]; // bekukan header saat scroll

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ---- Helpers ----

  private resolveDateRange(
    period?: ReportPeriod,
    startDateStr?: string,
    endDateStr?: string,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();

    if (period === ReportPeriod.CUSTOM || (!period && startDateStr)) {
      return {
        startDate: startDateStr ? new Date(startDateStr) : this.startOfDay(now),
        endDate: endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : this.endOfDay(now),
      };
    }

    if (period === ReportPeriod.WEEKLY) {
      const anchor = startDateStr ? new Date(startDateStr) : now;
      const day = anchor.getDay(); // 0=Sun
      const monday = new Date(anchor);
      monday.setDate(anchor.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: this.startOfDay(monday), endDate: this.endOfDay(sunday) };
    }

    if (period === ReportPeriod.MONTHLY) {
      const anchor = startDateStr ? new Date(startDateStr) : now;
      return {
        startDate: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
        endDate: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }

    // Default: DAILY
    const anchor = startDateStr ? new Date(startDateStr) : now;
    return { startDate: this.startOfDay(anchor), endDate: this.endOfDay(anchor) };
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private async getDailyBreakdown(
    outletIds: string[],
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ) {
    // Ambil semua transaksi COMPLETED di range, group by date di aplikasi
    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenantId,
        outletId: { in: outletIds },
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap = new Map<string, { date: string; count: number; total: Decimal }>();
    for (const trx of transactions) {
      const dateKey = trx.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const existing = dayMap.get(dateKey);
      if (existing) {
        existing.count += 1;
        existing.total = existing.total.plus(trx.totalAmount);
      } else {
        dayMap.set(dateKey, { date: dateKey, count: 1, total: trx.totalAmount });
      }
    }

    return Array.from(dayMap.values());
  }

  private async resolveAllowedOutlets(
    currentUser: AuthenticatedUser,
    requestedOutletId?: string,
  ): Promise<string[]> {
    if (currentUser.role === Role.CASHIER) {
      const outletId = currentUser.currentOutletId;
      if (!outletId) throw new ForbiddenException('Tidak ada outlet aktif di sesi ini');
      if (requestedOutletId && requestedOutletId !== outletId) {
        throw new ForbiddenException('Akses ke outlet ini ditolak');
      }
      return [outletId];
    }

    if (currentUser.role === Role.STORE_MANAGER) {
      const roles = await this.prisma.userOutletRole.findMany({
        where: { userId: currentUser.userId, tenantId: currentUser.tenantId! },
        select: { outletId: true },
      });
      const assigned = roles.map((r) => r.outletId);
      if (requestedOutletId) {
        if (!assigned.includes(requestedOutletId)) {
          throw new ForbiddenException('Akses ke outlet ini ditolak');
        }
        return [requestedOutletId];
      }
      return assigned;
    }

    if (requestedOutletId) return [requestedOutletId];
    const outlets = await this.prisma.outlet.findMany({
      where: { tenantId: currentUser.tenantId! },
      select: { id: true },
    });
    return outlets.map((o) => o.id);
  }
}
