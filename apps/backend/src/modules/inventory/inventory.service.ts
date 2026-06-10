import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateStockAdjustmentDto } from './dto/stock-adjustment.dto';
import { CreateStockTransferDto, UpdateTransferStatusDto } from './dto/stock-transfer.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { MutationQueryDto } from './dto/mutation-query.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Prisma, Role, StockMutationType, TransferStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---- Lihat Stok ----

  async findAll(currentUser: AuthenticatedUser, query: InventoryQueryDto) {
    const { outletId, search, categoryId, lowStock, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Store Manager hanya bisa lihat outlet yang di-assign
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, outletId);

    const where: any = {
      tenantId: currentUser.tenantId!,
      outletId: { in: allowedOutletIds },
      product: {
        status: 'ACTIVE',
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, imageUrl: true, category: { select: { id: true, name: true, color: true } } } },
          variant: { select: { id: true, name: true, sku: true } },
          outlet: { select: { id: true, name: true } },
        },
        orderBy: [{ outlet: { name: 'asc' } }, { product: { name: 'asc' } }],
        skip,
        take: limit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    const result = items.map((inv) => ({
      ...inv,
      isLowStock: inv.quantity.lessThanOrEqualTo(inv.minStock),
    }));

    const filtered = lowStock ? result.filter((inv) => inv.isLowStock) : result;

    return {
      items: filtered,
      meta: { total: lowStock ? filtered.length : total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(outletId: string, productId: string, variantId: string | undefined, currentUser: AuthenticatedUser) {
    await this.ensureOutletAccess(currentUser, outletId);

    const inventory = await this.prisma.inventory.findFirst({
      where: {
        outletId,
        productId,
        variantId: variantId ?? null,
        tenantId: currentUser.tenantId!,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        variant: { select: { id: true, name: true, sku: true } },
        outlet: { select: { id: true, name: true } },
      },
    });
    if (!inventory) throw new NotFoundException('Data stok tidak ditemukan');
    return inventory;
  }

  // ---- Mutation History ----

  async getMutations(currentUser: AuthenticatedUser, query: MutationQueryDto) {
    const { outletId, productId, type, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, outletId);

    const where: any = {
      tenantId: currentUser.tenantId!,
      outletId: { in: allowedOutletIds },
      ...(productId && { productId }),
      ...(type && { type: type as StockMutationType }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMutation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMutation.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---- Stock Adjustment (Opname) ----

  async createAdjustment(dto: CreateStockAdjustmentDto, currentUser: AuthenticatedUser) {
    await this.ensureOutletAccess(currentUser, dto.outletId);

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: currentUser.tenantId!,
          outletId: dto.outletId,
          userId: currentUser.userId,
          note: dto.note,
        },
      });

      const adjustmentItems: Prisma.StockAdjustmentItemCreateManyInput[] = [];
      const mutations: Prisma.StockMutationCreateManyInput[] = [];

      for (const item of dto.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            outletId: dto.outletId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            tenantId: currentUser.tenantId!,
          },
        });

        if (!inventory) {
          throw new NotFoundException(
            `Stok produk ${item.productId} tidak ditemukan di outlet ini`,
          );
        }

        const systemQty = inventory.quantity;
        const actualQty = new Decimal(item.actualQuantity);
        const diff = actualQty.minus(systemQty);

        adjustmentItems.push({
          adjustmentId: adjustment.id,
          productId: item.productId,
          variantId: item.variantId,
          systemQuantity: systemQty,
          actualQuantity: actualQty,
          difference: diff,
        });

        // Update stok
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: actualQty },
        });

        mutations.push({
          tenantId: currentUser.tenantId!,
          outletId: dto.outletId,
          productId: item.productId,
          variantId: item.variantId,
          type: StockMutationType.ADJUSTMENT,
          quantityBefore: systemQty,
          quantityChange: diff,
          quantityAfter: actualQty,
          referenceId: adjustment.id,
          referenceType: 'ADJUSTMENT',
          note: dto.note,
        });
      }

      await tx.stockAdjustmentItem.createMany({ data: adjustmentItems });
      await tx.stockMutation.createMany({ data: mutations });

      return tx.stockAdjustment.findUnique({
        where: { id: adjustment.id },
        include: { items: true },
      });
    }).then((result) => {
      void this.auditLogsService.log({
        tenantId: currentUser.tenantId,
        userId: currentUser.userId,
        action: 'STOCK_ADJUSTMENT_CREATE',
        resource: 'StockAdjustment',
        resourceId: result?.id,
        newValue: {
          outletId: dto.outletId,
          itemCount: dto.items.length,
          note: dto.note,
        },
      });
      return result;
    });
  }

  async getAdjustments(currentUser: AuthenticatedUser, outletId?: string) {
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, outletId);

    return this.prisma.stockAdjustment.findMany({
      where: { tenantId: currentUser.tenantId!, outletId: { in: allowedOutletIds } },
      include: {
        outlet: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ---- Stock Transfer ----

  async createTransfer(dto: CreateStockTransferDto, currentUser: AuthenticatedUser) {
    if (dto.fromOutletId === dto.toOutletId) {
      throw new BadRequestException('Outlet asal dan tujuan tidak boleh sama');
    }

    await this.ensureOutletAccess(currentUser, dto.fromOutletId);

    // Verifikasi kedua outlet milik tenant yang sama
    const [fromOutlet, toOutlet] = await Promise.all([
      this.prisma.outlet.findFirst({ where: { id: dto.fromOutletId, tenantId: currentUser.tenantId! } }),
      this.prisma.outlet.findFirst({ where: { id: dto.toOutletId, tenantId: currentUser.tenantId! } }),
    ]);
    if (!fromOutlet) throw new NotFoundException('Outlet asal tidak ditemukan');
    if (!toOutlet) throw new NotFoundException('Outlet tujuan tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      // Validasi stok cukup di outlet asal
      for (const item of dto.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            outletId: dto.fromOutletId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            tenantId: currentUser.tenantId!,
          },
        });

        if (!inventory) {
          throw new NotFoundException(`Stok produk ${item.productId} tidak ditemukan di outlet asal`);
        }

        if (inventory.quantity.lessThan(item.quantity)) {
          throw new BadRequestException(
            `Stok tidak cukup untuk produk ${item.productId}. Tersedia: ${inventory.quantity}, Diminta: ${item.quantity}`,
          );
        }
      }

      const transfer = await tx.stockTransfer.create({
        data: {
          tenantId: currentUser.tenantId!,
          fromOutletId: dto.fromOutletId,
          toOutletId: dto.toOutletId,
          requestedById: currentUser.userId,
          note: dto.note,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      return transfer;
    });
  }

  async processTransfer(transferId: string, dto: UpdateTransferStatusDto, currentUser: AuthenticatedUser) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId: currentUser.tenantId! },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer tidak ditemukan');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new ConflictException(`Transfer sudah berstatus ${transfer.status}`);
    }

    // CANCELLED hanya bisa dilakukan oleh pengaju
    if (dto.status === 'CANCELLED' && transfer.requestedById !== currentUser.userId) {
      throw new ForbiddenException('Hanya pengaju yang dapat membatalkan transfer');
    }

    // APPROVED / REJECTED harus punya akses ke outlet tujuan
    if (dto.status === 'APPROVED' || dto.status === 'REJECTED') {
      await this.ensureOutletAccess(currentUser, transfer.toOutletId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === 'APPROVED') {
        const mutations: Prisma.StockMutationCreateManyInput[] = [];

        for (const item of transfer.items) {
          const qty = new Decimal(item.quantity);

          // Kurangi stok outlet asal
          const fromInv = await tx.inventory.findFirst({
            where: {
              outletId: transfer.fromOutletId,
              productId: item.productId,
              variantId: item.variantId ?? null,
              tenantId: currentUser.tenantId!,
            },
          });
          if (!fromInv || fromInv.quantity.lessThan(qty)) {
            throw new BadRequestException(`Stok tidak mencukupi di outlet asal untuk produk ${item.productId}`);
          }

          const fromQtyAfter = fromInv.quantity.minus(qty);
          await tx.inventory.update({
            where: { id: fromInv.id },
            data: { quantity: fromQtyAfter },
          });

          mutations.push({
            tenantId: currentUser.tenantId!,
            outletId: transfer.fromOutletId,
            productId: item.productId,
            variantId: item.variantId,
            type: StockMutationType.TRANSFER_OUT,
            quantityBefore: fromInv.quantity,
            quantityChange: qty.negated(),
            quantityAfter: fromQtyAfter,
            referenceId: transfer.id,
            referenceType: 'TRANSFER',
            note: dto.note,
          });

          // Tambah stok outlet tujuan (upsert)
          const toInv = await tx.inventory.findFirst({
            where: {
              outletId: transfer.toOutletId,
              productId: item.productId,
              variantId: item.variantId ?? null,
              tenantId: currentUser.tenantId!,
            },
          });

          const toQtyBefore = toInv?.quantity ?? new Decimal(0);
          const toQtyAfter = toQtyBefore.plus(qty);

          if (toInv) {
            await tx.inventory.update({ where: { id: toInv.id }, data: { quantity: toQtyAfter } });
          } else {
            await tx.inventory.create({
              data: {
                tenantId: currentUser.tenantId!,
                outletId: transfer.toOutletId,
                productId: item.productId,
                variantId: item.variantId,
                quantity: toQtyAfter,
              },
            });
          }

          mutations.push({
            tenantId: currentUser.tenantId!,
            outletId: transfer.toOutletId,
            productId: item.productId,
            variantId: item.variantId,
            type: StockMutationType.TRANSFER_IN,
            quantityBefore: toQtyBefore,
            quantityChange: qty,
            quantityAfter: toQtyAfter,
            referenceId: transfer.id,
            referenceType: 'TRANSFER',
            note: dto.note,
          });
        }

        await tx.stockMutation.createMany({ data: mutations });
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: dto.status as TransferStatus,
          approvedById: dto.status !== 'CANCELLED' ? currentUser.userId : undefined,
          processedAt: new Date(),
        },
        include: {
          fromOutlet: { select: { id: true, name: true } },
          toOutlet: { select: { id: true, name: true } },
          items: true,
        },
      });
    }).then((result) => {
      void this.auditLogsService.log({
        tenantId: currentUser.tenantId,
        userId: currentUser.userId,
        action: `STOCK_TRANSFER_${dto.status}`,
        resource: 'StockTransfer',
        resourceId: transferId,
        newValue: {
          status: dto.status,
          fromOutletId: transfer.fromOutletId,
          toOutletId: transfer.toOutletId,
          note: dto.note,
        },
      });
      return result;
    });
  }

  async getTransfers(currentUser: AuthenticatedUser, outletId?: string) {
    const allowedOutletIds = await this.resolveAllowedOutlets(currentUser, outletId);

    return this.prisma.stockTransfer.findMany({
      where: {
        tenantId: currentUser.tenantId!,
        OR: [
          { fromOutletId: { in: allowedOutletIds } },
          { toOutletId: { in: allowedOutletIds } },
        ],
      },
      include: {
        fromOutlet: { select: { id: true, name: true } },
        toOutlet: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    });
  }

  // ---- Helpers ----

  private async resolveAllowedOutlets(currentUser: AuthenticatedUser, requestedOutletId?: string): Promise<string[]> {
    if (currentUser.role === Role.STORE_MANAGER) {
      const roles = await this.prisma.userOutletRole.findMany({
        where: { userId: currentUser.userId, tenantId: currentUser.tenantId! },
        select: { outletId: true },
      });
      const assigned = roles.map((r) => r.outletId);
      if (requestedOutletId) {
        if (!assigned.includes(requestedOutletId)) throw new ForbiddenException('Akses ke outlet ini ditolak');
        return [requestedOutletId];
      }
      return assigned;
    }

    if (requestedOutletId) return [requestedOutletId];

    // TENANT_OWNER dan di atas bisa lihat semua outlet
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

    if (currentUser.role === Role.STORE_MANAGER) {
      const role = await this.prisma.userOutletRole.findUnique({
        where: { userId_outletId: { userId: currentUser.userId, outletId } },
      });
      if (!role) throw new ForbiddenException('Akses ke outlet ini ditolak');
    }
  }
}
