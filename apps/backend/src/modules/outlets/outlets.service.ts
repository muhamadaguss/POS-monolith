import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Role } from '@prisma/client';

export class CreateOutletDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) taxRate?: number;
  @IsOptional() @IsString() receiptNote?: string;
}

export class UpdateOutletDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) taxRate?: number;
  @IsOptional() @IsString() receiptNote?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

const OUTLET_SELECT = {
  id: true,
  name: true,
  address: true,
  city: true,
  phone: true,
  isActive: true,
  timezone: true,
  taxRate: true,
  receiptNote: true,
  createdAt: true,
};

@Injectable()
export class OutletsService {
  constructor(private prisma: PrismaService) {}

  async findAll(currentUser: AuthenticatedUser) {
    if (currentUser.role === Role.STORE_MANAGER) {
      // Hanya outlet yang ditugaskan ke manager ini
      const roles = await this.prisma.userOutletRole.findMany({
        where: { userId: currentUser.userId, tenantId: currentUser.tenantId! },
        select: { outlet: { select: OUTLET_SELECT } },
      });
      return roles.map((r) => r.outlet);
    }

    return this.prisma.outlet.findMany({
      where: { tenantId: currentUser.tenantId! },
      select: OUTLET_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id, tenantId: currentUser.tenantId! },
      select: OUTLET_SELECT,
    });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan');
    return outlet;
  }

  async create(dto: CreateOutletDto, currentUser: AuthenticatedUser) {
    // Cek batas outlet sesuai plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: currentUser.tenantId! },
      select: { maxOutlets: true },
    });
    const count = await this.prisma.outlet.count({ where: { tenantId: currentUser.tenantId! } });
    if (tenant && count >= tenant.maxOutlets) {
      throw new ForbiddenException(`Paket Anda hanya mengizinkan maksimal ${tenant.maxOutlets} outlet`);
    }

    return this.prisma.outlet.create({
      data: { tenantId: currentUser.tenantId!, ...dto },
      select: OUTLET_SELECT,
    });
  }

  async update(id: string, dto: UpdateOutletDto, currentUser: AuthenticatedUser) {
    await this.findOne(id, currentUser);
    return this.prisma.outlet.update({
      where: { id },
      data: dto,
      select: OUTLET_SELECT,
    });
  }
}
