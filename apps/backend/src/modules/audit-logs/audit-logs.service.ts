import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogInput {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId ?? null,
          userId: input.userId ?? null,
          action: input.action,
          resource: input.resource ?? null,
          resourceId: input.resourceId ?? null,
          oldValue: (input.oldValue as Prisma.InputJsonValue) ?? undefined,
          newValue: (input.newValue as Prisma.InputJsonValue) ?? undefined,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch {
      // Audit log gagal tidak boleh menghentikan request utama
    }
  }

  async findAll(
    tenantId: string | null,
    query: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { userId, action, resource, startDate, endDate, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(tenantId !== null && { tenantId }),
      ...(userId && { userId }),
      ...(action && { action: { contains: action, mode: 'insensitive' } }),
      ...(resource && { resource }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate + 'T23:59:59.999Z') }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Lampirkan nama pengguna. AuditLog.userId nullable & tanpa relasi formal,
    // jadi ambil nama dalam satu query batch lalu petakan ke tiap baris.
    const userIds = [...new Set(items.map((i) => i.userId).filter((id): id is string => !!id))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const itemsWithUser = items.map((item) => ({
      ...item,
      userName: item.userId ? (nameById.get(item.userId) ?? null) : null,
    }));

    return {
      items: itemsWithUser,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
