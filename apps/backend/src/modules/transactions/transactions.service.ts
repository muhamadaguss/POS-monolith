import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Decimal } from '@prisma/client/runtime/library';
import { Role, StockMutationType, TransactionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Field outlet yang dibutuhkan untuk mencetak struk (header lengkap + pajak +
 * catatan kaki). Dipakai seragam saat membuat transaksi maupun mengambil
 * detailnya, agar payload struk konsisten di semua jalur.
 */
const RECEIPT_OUTLET_SELECT = {
  id: true,
  name: true,
  address: true,
  city: true,
  phone: true,
  taxRate: true,
  receiptNote: true,
} as const;

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private shiftsService: ShiftsService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---- Buat Transaksi ----

  async createTransaction(dto: CreateTransactionDto, currentUser: AuthenticatedUser) {
    // 1. Validasi outlet milik tenant
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, tenantId: currentUser.tenantId! },
    });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan');

    // 2. Cashier hanya bisa transaksi di outlet aktifnya
    if (currentUser.role === Role.CASHIER) {
      if (currentUser.currentOutletId !== dto.outletId) {
        throw new ForbiddenException('Kasir hanya dapat melakukan transaksi di outlet aktif');
      }
    }

    // 3. Validasi shift aktif
    const shiftId = await this.shiftsService.requireActiveShift(dto.outletId, currentUser);

    // 4. Validasi diskon (jika ada)
    let discountAmount = new Decimal(0);
    let discountRecord: { id: string; type: string; value: Decimal; maxDiscount: Decimal | null } | null = null;

    if (dto.discountId) {
      discountRecord = await this.prisma.discount.findFirst({
        where: {
          id: dto.discountId,
          tenantId: currentUser.tenantId!,
          isActive: true,
        },
      });
      if (!discountRecord) throw new NotFoundException('Diskon tidak ditemukan atau tidak aktif');

      const now = new Date();
      const discount = await this.prisma.discount.findUnique({ where: { id: dto.discountId } });
      if (!discount) throw new NotFoundException('Diskon tidak ditemukan');
      if (discount.startsAt && now < discount.startsAt) {
        throw new BadRequestException('Diskon belum aktif');
      }
      if (discount.endsAt && now > discount.endsAt) {
        throw new BadRequestException('Diskon sudah kadaluarsa');
      }
    }

    // 5. Validasi semua item: produk, varian, stok, harga
    const itemsData: Array<{
      productId: string;
      variantId?: string;
      productName: string;
      variantName?: string;
      sku: string;
      quantity: Decimal;
      unitPrice: Decimal;
      costPrice: Decimal;
      inventoryId: string;
      currentStock: Decimal;
    }> = [];

    for (const item of dto.items) {
      // Validasi produk
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId: currentUser.tenantId!, status: 'ACTIVE' },
      });
      if (!product) {
        throw new NotFoundException(`Produk tidak ditemukan atau tidak aktif: ${item.productId}`);
      }

      // Validasi varian jika ada
      let variantName: string | undefined;
      let variantSku: string | undefined;
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findFirst({
          where: { id: item.variantId, productId: item.productId, status: 'ACTIVE' },
        });
        if (!variant) {
          throw new NotFoundException(`Varian tidak ditemukan atau tidak aktif: ${item.variantId}`);
        }
        variantName = variant.name;
        variantSku = variant.sku;
      }

      // Ambil harga outlet (wajib ada)
      const outletPrice = await this.prisma.outletPrice.findFirst({
        where: {
          outletId: dto.outletId,
          productId: item.productId,
          variantId: item.variantId ?? null,
        },
      });
      if (!outletPrice) {
        throw new BadRequestException(
          `Harga belum di-set untuk produk ${product.name}${variantName ? ` (${variantName})` : ''} di outlet ini`,
        );
      }

      // Cek stok
      const inventory = await this.prisma.inventory.findFirst({
        where: {
          outletId: dto.outletId,
          productId: item.productId,
          variantId: item.variantId ?? null,
        },
      });
      if (!inventory) {
        throw new BadRequestException(
          `Stok belum di-set untuk produk ${product.name}${variantName ? ` (${variantName})` : ''}`,
        );
      }

      const qty = new Decimal(item.quantity);
      if (inventory.quantity.lessThan(qty)) {
        throw new BadRequestException(
          `Stok tidak cukup untuk produk ${product.name}${variantName ? ` (${variantName})` : ''}. ` +
            `Tersedia: ${inventory.quantity}, Diminta: ${qty}`,
        );
      }

      itemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: product.name,
        variantName,
        sku: variantSku ?? product.sku,
        quantity: qty,
        unitPrice: outletPrice.sellPrice,
        costPrice: outletPrice.costPrice,
        inventoryId: inventory.id,
        currentStock: inventory.quantity,
      });
    }

    // 6. Hitung subtotal
    let subtotal = new Decimal(0);
    const itemsWithSubtotal = itemsData.map((item) => {
      const itemSubtotal = item.unitPrice.times(item.quantity);
      subtotal = subtotal.plus(itemSubtotal);
      return { ...item, subtotal: itemSubtotal };
    });

    // 7. Hitung diskon
    if (discountRecord) {
      const discount = await this.prisma.discount.findUnique({ where: { id: dto.discountId! } });
      if (discount) {
        if (discount.minPurchase && subtotal.lessThan(discount.minPurchase)) {
          throw new BadRequestException(
            `Minimum pembelian untuk diskon ini adalah ${discount.minPurchase}`,
          );
        }
        if (discount.type === 'PERCENTAGE') {
          discountAmount = subtotal.times(discount.value).dividedBy(100);
          if (discount.maxDiscount && discountAmount.greaterThan(discount.maxDiscount)) {
            discountAmount = discount.maxDiscount;
          }
        } else {
          discountAmount = discount.value;
          if (discountAmount.greaterThan(subtotal)) discountAmount = subtotal;
        }
      }
    }

    // 8. Hitung pajak dan total
    const taxRate = outlet.taxRate ?? new Decimal(0);
    const taxableAmount = subtotal.minus(discountAmount);
    const taxAmount = taxableAmount.times(taxRate);
    const totalAmount = taxableAmount.plus(taxAmount);

    // 9. Validasi pembayaran
    const amountPaid = new Decimal(dto.amountPaid);
    if (amountPaid.lessThan(totalAmount)) {
      throw new BadRequestException(
        `Jumlah bayar (${amountPaid}) kurang dari total (${totalAmount})`,
      );
    }
    const changeAmount = amountPaid.minus(totalAmount);

    // 10. Generate nomor struk: TRX-{outletId slice}-{timestamp}-{random}
    const receiptNumber = await this.generateReceiptNumber(dto.outletId);

    // 11. Eksekusi dalam satu transaksi DB
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Buat transaksi
      const newTransaction = await tx.transaction.create({
        data: {
          tenantId: currentUser.tenantId!,
          outletId: dto.outletId,
          shiftId,
          cashierId: currentUser.userId,
          receiptNumber,
          status: TransactionStatus.COMPLETED,
          subtotal,
          discountId: dto.discountId ?? null,
          discountAmount,
          taxAmount,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          amountPaid,
          changeAmount,
          notes: dto.notes,
          items: {
            create: itemsWithSubtotal.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              productName: item.productName,
              variantName: item.variantName ?? null,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              discountAmount: new Decimal(0),
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: true,
          outlet: { select: RECEIPT_OUTLET_SELECT },
          cashier: { select: { id: true, name: true } },
          discount: { select: { id: true, name: true, type: true, value: true } },
        },
      });

      // Kurangi stok dan catat mutasi untuk setiap item
      for (const item of itemsWithSubtotal) {
        const newQuantity = item.currentStock.minus(item.quantity);

        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { quantity: newQuantity },
        });

        await tx.stockMutation.create({
          data: {
            tenantId: currentUser.tenantId!,
            outletId: dto.outletId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            type: StockMutationType.SALE,
            quantityBefore: item.currentStock,
            quantityChange: item.quantity.negated(),
            quantityAfter: newQuantity,
            referenceId: newTransaction.id,
            referenceType: 'TRANSACTION',
            note: `Penjualan - Struk ${receiptNumber}`,
          },
        });
      }

      return newTransaction;
    });

    return transaction;
  }

  // ---- Void Transaksi ----

  async voidTransaction(
    transactionId: string,
    dto: VoidTransactionDto,
    currentUser: AuthenticatedUser,
  ) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId: currentUser.tenantId! },
      include: {
        items: true,
        outlet: { select: { id: true, name: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');
    if (transaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Transaksi sudah di-void');
    }

    // Verifikasi PIN manager
    // Manager atau Tenant Owner yang bisa void — cari user yang punya POS_VOID
    // PIN diverifikasi terhadap PIN user yang sedang login (jika Manager)
    // atau bisa juga dicari manager di outlet tersebut
    const authorizedUser = await this.findManagerWithPin(
      dto.managerPin,
      transaction.outletId,
      currentUser,
    );

    // Restore stok untuk setiap item
    const updatedTransaction = await this.prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            outletId: transaction.outletId,
            productId: item.productId,
            variantId: item.variantId ?? null,
          },
        });

        if (inventory) {
          const newQuantity = inventory.quantity.plus(item.quantity);
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: newQuantity },
          });

          await tx.stockMutation.create({
            data: {
              tenantId: currentUser.tenantId!,
              outletId: transaction.outletId,
              productId: item.productId,
              variantId: item.variantId ?? null,
              type: StockMutationType.RETURN,
              quantityBefore: inventory.quantity,
              quantityChange: item.quantity,
              quantityAfter: newQuantity,
              referenceId: transaction.id,
              referenceType: 'TRANSACTION',
              note: `Void - Struk ${transaction.receiptNumber}: ${dto.voidReason}`,
            },
          });
        }
      }

      return tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.VOIDED,
          voidedAt: new Date(),
          voidReason: dto.voidReason,
          voidAuthorizedById: authorizedUser.id,
        },
        include: {
          items: true,
          outlet: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
          voidAuthorizedBy: { select: { id: true, name: true } },
        },
      });
    });

    void this.auditLogsService.log({
      tenantId: currentUser.tenantId,
      userId: currentUser.userId,
      action: 'TRANSACTION_VOID',
      resource: 'Transaction',
      resourceId: transactionId,
      newValue: {
        voidReason: dto.voidReason,
        authorizedById: authorizedUser.id,
        receiptNumber: transaction.receiptNumber,
        totalAmount: transaction.totalAmount.toString(),
      },
    });

    return updatedTransaction;
  }

  // ---- Refund Transaksi ----
  // Mirip void: kembalikan stok + butuh PIN manager. Bedanya status menjadi
  // REFUNDED (transaksi tetap ada di riwayat sebagai "dikembalikan").

  async refundTransaction(
    transactionId: string,
    dto: RefundTransactionDto,
    currentUser: AuthenticatedUser,
  ) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId: currentUser.tenantId! },
      include: {
        items: true,
        outlet: { select: { id: true, name: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');
    if (transaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Transaksi sudah di-void, tidak bisa di-refund');
    }
    if (transaction.status === TransactionStatus.REFUNDED) {
      throw new BadRequestException('Transaksi sudah di-refund');
    }

    // Verifikasi PIN manager (sama seperti void) — kasir bisa memulai, manager mengotorisasi.
    const authorizedUser = await this.findManagerWithPin(
      dto.managerPin,
      transaction.outletId,
      currentUser,
    );

    // Restore stok untuk setiap item + tandai transaksi sebagai REFUNDED.
    const updatedTransaction = await this.prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            outletId: transaction.outletId,
            productId: item.productId,
            variantId: item.variantId ?? null,
          },
        });

        if (inventory) {
          const newQuantity = inventory.quantity.plus(item.quantity);
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: newQuantity },
          });

          await tx.stockMutation.create({
            data: {
              tenantId: currentUser.tenantId!,
              outletId: transaction.outletId,
              productId: item.productId,
              variantId: item.variantId ?? null,
              type: StockMutationType.RETURN,
              quantityBefore: inventory.quantity,
              quantityChange: item.quantity,
              quantityAfter: newQuantity,
              referenceId: transaction.id,
              referenceType: 'TRANSACTION',
              note: `Refund - Struk ${transaction.receiptNumber}: ${dto.refundReason}`,
            },
          });
        }
      }

      return tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REFUNDED,
          refundedAt: new Date(),
          refundReason: dto.refundReason,
          refundAuthorizedById: authorizedUser.id,
        },
        include: {
          items: true,
          outlet: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
          refundAuthorizedBy: { select: { id: true, name: true } },
        },
      });
    });

    void this.auditLogsService.log({
      tenantId: currentUser.tenantId,
      userId: currentUser.userId,
      action: 'TRANSACTION_REFUND',
      resource: 'Transaction',
      resourceId: transactionId,
      newValue: {
        refundReason: dto.refundReason,
        authorizedById: authorizedUser.id,
        receiptNumber: transaction.receiptNumber,
        totalAmount: transaction.totalAmount.toString(),
      },
    });

    return updatedTransaction;
  }

  // ---- Daftar Transaksi ----

  async findAll(currentUser: AuthenticatedUser, query: TransactionQueryDto) {
    const { outletId, shiftId, status, paymentMethod, startDate, endDate, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, outletId);

    const where: any = {
      tenantId: currentUser.tenantId!,
      outletId: { in: allowedOutletIds },
      ...(shiftId && { shiftId }),
      ...(status && { status }),
      ...(paymentMethod && { paymentMethod }),
      ...(search && { receiptNumber: { contains: search, mode: 'insensitive' } }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate + 'T23:59:59.999Z') }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
          discount: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---- Detail Transaksi ----

  async findOne(transactionId: string, currentUser: AuthenticatedUser) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId: currentUser.tenantId! },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
            variant: { select: { id: true, name: true } },
          },
        },
        outlet: { select: RECEIPT_OUTLET_SELECT },
        cashier: { select: { id: true, name: true } },
        shift: { select: { id: true, openedAt: true } },
        discount: { select: { id: true, name: true, type: true, value: true } },
        voidAuthorizedBy: { select: { id: true, name: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan');

    // Validasi akses outlet
    await this.ensureOutletAccess(currentUser, transaction.outletId);

    return transaction;
  }

  // ---- Helpers ----

  private async generateReceiptNumber(outletId: string): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    // Hitung transaksi hari ini di outlet ini
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const count = await this.prisma.transaction.count({
      where: {
        outletId,
        createdAt: { gte: startOfDay },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    const prefix = outletId.slice(-4).toUpperCase();
    return `TRX-${prefix}-${dateStr}-${seq}`;
  }

  private async findManagerWithPin(
    pin: string,
    outletId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ id: string }> {
    // Cari semua user di tenant yang punya PIN dan role Manager/Owner
    const candidates = await this.prisma.user.findMany({
      where: {
        tenantId: currentUser.tenantId!,
        pin: { not: null },
        role: { in: [Role.STORE_MANAGER, Role.TENANT_OWNER] },
        status: 'ACTIVE',
      },
      select: { id: true, pin: true, role: true },
    });

    for (const candidate of candidates) {
      if (!candidate.pin) continue;
      const match = await bcrypt.compare(pin, candidate.pin);
      if (match) {
        // Jika STORE_MANAGER, pastikan dia punya akses ke outlet ini
        if (candidate.role === Role.STORE_MANAGER) {
          const outletRole = await this.prisma.userOutletRole.findUnique({
            where: { userId_outletId: { userId: candidate.id, outletId } },
          });
          if (!outletRole) continue;
        }
        return { id: candidate.id };
      }
    }

    throw new UnauthorizedException('PIN manager tidak valid atau tidak memiliki akses ke outlet ini');
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

  private async ensureOutletAccess(currentUser: AuthenticatedUser, outletId: string) {
    if (currentUser.role === Role.CASHIER) {
      if (currentUser.currentOutletId !== outletId) {
        throw new ForbiddenException('Akses ke transaksi outlet ini ditolak');
      }
      return;
    }
    if (currentUser.role === Role.STORE_MANAGER) {
      const role = await this.prisma.userOutletRole.findUnique({
        where: { userId_outletId: { userId: currentUser.userId, outletId } },
      });
      if (!role) throw new ForbiddenException('Akses ke transaksi outlet ini ditolak');
    }
  }
}
