import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ShiftQueryDto } from './dto/shift-query.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Decimal } from '@prisma/client/runtime/library';
import { Role, ShiftStatus } from '@prisma/client';
import { PERMISSIONS } from '../../common/rbac/permissions';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  // ---- Buka Shift ----

  async openShift(dto: OpenShiftDto, currentUser: AuthenticatedUser) {
    await this.ensureOutletAccess(currentUser, dto.outletId);

    // Cek apakah ada shift yang masih OPEN di outlet ini
    const existingOpen = await this.prisma.shift.findFirst({
      where: { outletId: dto.outletId, status: ShiftStatus.OPEN, tenantId: currentUser.tenantId! },
    });
    if (existingOpen) {
      throw new ConflictException(
        `Shift masih aktif di outlet ini (dibuka oleh kasir lain). Tutup shift sebelumnya terlebih dahulu.`,
      );
    }

    // Cashier hanya bisa buka shift untuk outlet yang sedang aktif (currentOutletId di JWT)
    if (currentUser.role === Role.CASHIER) {
      if (currentUser.currentOutletId !== dto.outletId) {
        throw new ForbiddenException('Kasir hanya dapat membuka shift di outlet yang sedang aktif');
      }
    }

    return this.prisma.shift.create({
      data: {
        tenantId: currentUser.tenantId!,
        outletId: dto.outletId,
        openedById: currentUser.userId,
        openingCash: new Decimal(dto.openingCash),
        notes: dto.notes,
        status: ShiftStatus.OPEN,
      },
      include: {
        outlet: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // ---- Tutup Shift ----

  async closeShift(shiftId: string, dto: CloseShiftDto, currentUser: AuthenticatedUser) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId: currentUser.tenantId! },
    });
    if (!shift) throw new NotFoundException('Shift tidak ditemukan');
    if (shift.status === ShiftStatus.CLOSED) {
      throw new ConflictException('Shift sudah ditutup');
    }

    await this.ensureOutletAccess(currentUser, shift.outletId);

    // Cashier hanya bisa tutup shift miliknya sendiri
    if (currentUser.role === Role.CASHIER && shift.openedById !== currentUser.userId) {
      throw new ForbiddenException('Kasir hanya dapat menutup shift miliknya sendiri');
    }

    // Kas masuk = uang yang SECARA FISIK diterima saat penjualan tunai.
    // Termasuk transaksi yang kemudian di-REFUND: uangnya tetap pernah masuk
    // laci saat transaksi terjadi; pengembaliannya dikurangkan terpisah di
    // `totalCashRefund` (lihat bawah) agar tidak dobel-koreksi.
    // VOIDED dikecualikan: transaksi void dianggap tak pernah terjadi sama sekali.
    const cashTransactions = await this.prisma.transaction.aggregate({
      where: {
        shiftId: shift.id,
        paymentMethod: 'CASH',
        status: { in: ['COMPLETED', 'REFUNDED'] },
      },
      _sum: { amountPaid: true, changeAmount: true },
    });

    const totalCashIn = (cashTransactions._sum.amountPaid ?? new Decimal(0))
      .minus(cashTransactions._sum.changeAmount ?? new Decimal(0));

    // Kas keluar = uang yang dikembalikan ke pelanggan saat refund (CASH).
    const refundTransactions = await this.prisma.transaction.aggregate({
      where: {
        shiftId: shift.id,
        paymentMethod: 'CASH',
        status: 'REFUNDED',
      },
      _sum: { totalAmount: true },
    });
    const totalCashRefund = refundTransactions._sum.totalAmount ?? new Decimal(0);

    const expectedCash = new Decimal(shift.openingCash)
      .plus(totalCashIn)
      .minus(totalCashRefund);

    const closingCash = new Decimal(dto.closingCash);
    const cashDifference = closingCash.minus(expectedCash);

    // Rekap penjualan shift — hanya transaksi yang benar-benar selesai.
    // VOIDED dan REFUNDED dikecualikan karena keduanya dibalik (bukan penjualan),
    // konsisten dengan halaman Laporan & Riwayat Transaksi di frontend.
    const transactionSummary = await this.prisma.transaction.aggregate({
      where: { shiftId: shift.id, status: 'COMPLETED' },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closedById: currentUser.userId,
        closingCash,
        expectedCash,
        cashDifference,
        closedAt: new Date(),
        notes: dto.notes ?? shift.notes,
      },
      include: {
        outlet: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        transactions: {
          select: { id: true, status: true, totalAmount: true, paymentMethod: true },
        },
      },
    }).then((updatedShift) => ({
      ...updatedShift,
      summary: {
        totalTransactions: transactionSummary._count?.id ?? 0,
        totalSales: transactionSummary._sum?.totalAmount ?? new Decimal(0),
        totalCashIn,
        totalCashRefund,
        openingCash: shift.openingCash,
        expectedCash,
        closingCash,
        cashDifference,
      },
    }));
  }

  // ---- Shift Aktif ----

  async getActiveShift(outletId: string, currentUser: AuthenticatedUser) {
    await this.ensureOutletAccess(currentUser, outletId);

    const shift = await this.prisma.shift.findFirst({
      where: { outletId, status: ShiftStatus.OPEN, tenantId: currentUser.tenantId! },
      include: {
        outlet: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true } },
        _count: { select: { transactions: { where: { status: 'COMPLETED' } } } },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) throw new NotFoundException('Tidak ada shift yang aktif di outlet ini');

    // Hitung summary transaksi untuk shift aktif
    const [cashAgg, nonCashAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { shiftId: shift.id, status: 'COMPLETED', paymentMethod: 'CASH' },
        _sum: { totalAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          shiftId: shift.id,
          status: 'COMPLETED',
          paymentMethod: { not: 'CASH' },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalCash = cashAgg._sum.totalAmount ?? new Decimal(0);
    const totalNonCash = nonCashAgg._sum.totalAmount ?? new Decimal(0);

    return {
      ...shift,
      summary: {
        totalTransactions: shift._count.transactions,
        totalSales: totalCash.plus(totalNonCash),
        totalCash,
        totalNonCash,
      },
    };
  }

  // ---- Riwayat Shift ----

  async findAll(currentUser: AuthenticatedUser, query: ShiftQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = await this.buildShiftWhere(currentUser, query);

    const [items, total] = await Promise.all([
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

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---- Detail Shift ----

  async findOne(shiftId: string, currentUser: AuthenticatedUser) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId: currentUser.tenantId! },
      include: {
        outlet: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true, email: true } },
        transactions: {
          select: {
            id: true,
            receiptNumber: true,
            status: true,
            paymentMethod: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: { select: { transactions: true } },
      },
    });
    if (!shift) throw new NotFoundException('Shift tidak ditemukan');

    await this.ensureOutletAccess(currentUser, shift.outletId);
    return shift;
  }

  // ---- Statistik Ringkas (kartu di halaman Riwayat Shift) ----

  /**
   * Agregat untuk periode/filter terpilih:
   * - totalShifts: jumlah shift pada filter
   * - totalCashDifference: jumlah selisih kas shift CLOSED (Decimal → string)
   * - avgDurationMinutes: rata-rata durasi shift CLOSED (closedAt − openedAt), menit
   *
   * Dihitung di seluruh data terfilter (bukan hanya satu halaman), agar angka
   * jujur terhadap label periode.
   */
  async getStats(currentUser: AuthenticatedUser, query: ShiftQueryDto) {
    const where = await this.buildShiftWhere(currentUser, query);

    const [totalShifts, closed] = await Promise.all([
      this.prisma.shift.count({ where }),
      this.prisma.shift.findMany({
        where: { ...where, status: ShiftStatus.CLOSED },
        select: { openingCash: true, closingCash: true, cashDifference: true, openedAt: true, closedAt: true },
      }),
    ]);

    let cashDiff = new Decimal(0);
    let durationMsTotal = 0;
    let durationCount = 0;
    for (const s of closed) {
      if (s.cashDifference) cashDiff = cashDiff.plus(s.cashDifference);
      if (s.closedAt) {
        durationMsTotal += s.closedAt.getTime() - s.openedAt.getTime();
        durationCount += 1;
      }
    }
    const avgDurationMinutes =
      durationCount > 0 ? Math.round(durationMsTotal / durationCount / 60_000) : 0;

    return {
      totalShifts,
      totalCashDifference: cashDiff.toString(),
      avgDurationMinutes,
    };
  }

  // ---- Export Excel (Riwayat Shift) ----

  /** Generate workbook .xlsx dari shift terfilter (tanpa pagination). */
  async exportXlsx(currentUser: AuthenticatedUser, query: ShiftQueryDto): Promise<Buffer> {
    const where = await this.buildShiftWhere(currentUser, query);
    const shifts = await this.prisma.shift.findMany({
      where,
      include: {
        outlet: { select: { name: true } },
        openedBy: { select: { name: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 10_000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kasirku';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Riwayat Shift');

    sheet.columns = [
      { header: 'Outlet', key: 'outlet', width: 22 },
      { header: 'Kasir', key: 'cashier', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Waktu Buka', key: 'openedAt', width: 20 },
      { header: 'Waktu Tutup', key: 'closedAt', width: 20 },
      { header: 'Durasi (menit)', key: 'duration', width: 16 },
      { header: 'Jumlah Transaksi', key: 'txnCount', width: 18 },
      { header: 'Kas Awal', key: 'openingCash', width: 16 },
      { header: 'Kas Fisik', key: 'closingCash', width: 16 },
      { header: 'Selisih Kas', key: 'cashDifference', width: 16 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 20;

    const MONEY_FMT = '#,##0';

    for (const s of shifts) {
      const duration =
        s.closedAt != null
          ? Math.round((s.closedAt.getTime() - s.openedAt.getTime()) / 60_000)
          : '';
      sheet.addRow({
        outlet: s.outlet.name,
        cashier: s.openedBy.name,
        status: s.status === ShiftStatus.CLOSED ? 'Ditutup' : 'Berjalan',
        openedAt: s.openedAt,
        closedAt: s.closedAt ?? '',
        duration,
        txnCount: s._count.transactions,
        openingCash: Number(s.openingCash),
        closingCash: s.closingCash != null ? Number(s.closingCash) : '',
        cashDifference: s.cashDifference != null ? Number(s.cashDifference) : '',
      });
    }

    ['openingCash', 'closingCash', 'cashDifference'].forEach((key) => {
      sheet.getColumn(key).numFmt = MONEY_FMT;
    });
    ['openedAt', 'closedAt'].forEach((key) => {
      sheet.getColumn(key).numFmt = 'yyyy-mm-dd hh:mm';
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ---- Validasi Shift Aktif (digunakan oleh POS module) ----

  async requireActiveShift(outletId: string, currentUser: AuthenticatedUser): Promise<string> {
    const shift = await this.prisma.shift.findFirst({
      where: { outletId, status: ShiftStatus.OPEN, tenantId: currentUser.tenantId! },
      orderBy: { openedAt: 'desc' },
    });
    if (!shift) {
      throw new BadRequestException(
        'Tidak ada shift aktif. Buka shift terlebih dahulu sebelum melakukan transaksi.',
      );
    }
    return shift.id;
  }

  // ---- Helpers ----

  /**
   * Bangun klausa `where` Prisma untuk daftar/statistik/export shift, dengan
   * scoping outlet sesuai role + filter status/tanggal/search. Dipakai bersama
   * oleh findAll, getStats, dan getExportRows agar konsisten.
   */
  private async buildShiftWhere(currentUser: AuthenticatedUser, query: ShiftQueryDto) {
    const { outletId, status, startDate, endDate, search } = query;
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, outletId);

    const where: any = {
      tenantId: currentUser.tenantId!,
      outletId: { in: allowedOutletIds },
      ...(status && { status: status as ShiftStatus }),
      ...(startDate || endDate
        ? {
            openedAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search?.trim()
        ? {
            OR: [
              { openedBy: { name: { contains: search.trim(), mode: 'insensitive' } } },
              { outlet: { name: { contains: search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    return where;
  }

  private async resolveAllowedOutlets(
    currentUser: AuthenticatedUser,
    requestedOutletId?: string,
  ): Promise<string[]> {
    if (currentUser.role === Role.CASHIER) {
      // Cashier hanya bisa lihat shift di outlet aktifnya
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

    // TENANT_OWNER dan di atas bisa lihat semua outlet
    if (requestedOutletId) return [requestedOutletId];
    const outlets = await this.prisma.outlet.findMany({
      where: { tenantId: currentUser.tenantId! },
      select: { id: true },
    });
    return outlets.map((o) => o.id);
  }

  private async ensureOutletAccess(currentUser: AuthenticatedUser, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, tenantId: currentUser.tenantId! },
    });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan');

    if (currentUser.role === Role.CASHIER) {
      if (currentUser.currentOutletId !== outletId) {
        throw new ForbiddenException('Akses ke outlet ini ditolak');
      }
      return;
    }

    if (currentUser.role === Role.STORE_MANAGER) {
      const role = await this.prisma.userOutletRole.findUnique({
        where: { userId_outletId: { userId: currentUser.userId, outletId } },
      });
      if (!role) throw new ForbiddenException('Akses ke outlet ini ditolak');
    }
  }
}
