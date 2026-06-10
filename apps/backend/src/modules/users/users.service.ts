import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
  outletRoles: {
    select: {
      role: true,
      outlet: { select: { id: true, name: true } },
    },
  },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(currentUser: AuthenticatedUser) {
    // Store Manager hanya bisa melihat staf di outletnya sendiri
    if (currentUser.role === Role.STORE_MANAGER) {
      if (!currentUser.currentOutletId) throw new ForbiddenException('Pilih outlet terlebih dahulu');

      return this.prisma.user.findMany({
        where: {
          tenantId: currentUser.tenantId!,
          outletRoles: { some: { outletId: currentUser.currentOutletId } },
        },
        select: USER_SELECT,
        orderBy: { name: 'asc' },
      });
    }

    return this.prisma.user.findMany({
      where: { tenantId: currentUser.tenantId! },
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: currentUser.tenantId! },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    if (currentUser.role === Role.STORE_MANAGER) {
      const hasAccess = user.outletRoles.some(
        (r) => r.outlet.id === currentUser.currentOutletId,
      );
      if (!hasAccess) throw new ForbiddenException('Akses ditolak');
    }

    return user;
  }

  async create(dto: CreateUserDto, currentUser: AuthenticatedUser) {
    // Verifikasi outlet milik tenant ini
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, tenantId: currentUser.tenantId! },
    });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const pinHash = dto.pin ? await bcrypt.hash(dto.pin, 10) : undefined;

    const user = await this.prisma.user.create({
      data: {
        tenantId: currentUser.tenantId!,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        pin: pinHash,
        role: dto.role as Role,
        outletRoles: {
          create: {
            outletId: dto.outletId,
            tenantId: currentUser.tenantId!,
            role: dto.role as Role,
          },
        },
      },
      select: USER_SELECT,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUser: AuthenticatedUser) {
    const user = await this.findOne(id, currentUser);

    const updateData: Record<string, unknown> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.status) updateData.status = dto.status;
    if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.pin) updateData.pin = await bcrypt.hash(dto.pin, 10);

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: USER_SELECT,
    });
  }

  async deactivate(id: string, currentUser: AuthenticatedUser) {
    await this.findOne(id, currentUser);
    return this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: { id: true, name: true, status: true },
    });
  }

  // Ganti role user di outlet tertentu
  async assignOutletRole(
    userId: string,
    outletId: string,
    role: Role,
    currentUser: AuthenticatedUser,
  ) {
    await this.findOne(userId, currentUser);

    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, tenantId: currentUser.tenantId! },
    });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan');

    await this.prisma.userOutletRole.upsert({
      where: { userId_outletId: { userId, outletId } },
      create: { userId, outletId, tenantId: currentUser.tenantId!, role },
      update: { role },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: USER_SELECT,
    });
  }

  // Hapus role user dari outlet tertentu
  async unassignOutletRole(
    userId: string,
    outletId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.findOne(userId, currentUser);

    await this.prisma.userOutletRole.deleteMany({
      where: { userId, outletId, tenantId: currentUser.tenantId! },
    });
  }
}
