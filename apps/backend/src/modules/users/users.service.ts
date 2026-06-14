import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  generatePassword,
  generatePin,
} from '../../common/utils/credential.util';

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
      if (!currentUser.currentOutletId)
        throw new ForbiddenException('Pilih outlet terlebih dahulu');

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

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
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
        role: dto.role,
        outletRoles: {
          create: {
            outletId: dto.outletId,
            tenantId: currentUser.tenantId!,
            role: dto.role,
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

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: USER_SELECT,
    });
  }

  /**
   * Reset password staf: generate password kuat acak, set hash +
   * mustChangePassword=true, dan REVOKE semua refresh token user (agar sesi hidup
   * tak bisa bypass force-change). Mengembalikan plaintext SEKALI untuk disampaikan
   * owner/manager ke staf. Scope tenant/outlet ditegakkan via findOne.
   */
  async resetPassword(id: string, currentUser: AuthenticatedUser) {
    if (id === currentUser.userId) {
      throw new BadRequestException(
        'Gunakan menu Ganti Password untuk akun Anda sendiri',
      );
    }
    const user = await this.findOne(id, currentUser);
    // Manager (tanpa staff.manage_global) tak boleh mereset password Owner.
    if (
      user.role === Role.TENANT_OWNER &&
      currentUser.role !== Role.TENANT_OWNER
    ) {
      throw new ForbiddenException('Tidak dapat mereset password Owner');
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      password,
      message:
        'Password berhasil direset. Sampaikan password ini ke staf; staf wajib menggantinya saat login.',
    };
  }

  /**
   * Reset PIN staf: generate 6 digit acak, simpan ter-hash. Mengembalikan PIN
   * plaintext SEKALI untuk disampaikan owner/manager ke staf. Scope ditegakkan via findOne.
   */
  async resetPin(id: string, currentUser: AuthenticatedUser) {
    if (id === currentUser.userId) {
      throw new BadRequestException(
        'Gunakan menu akun Anda untuk mengubah PIN sendiri',
      );
    }
    const user = await this.findOne(id, currentUser);
    if (
      user.role === Role.TENANT_OWNER &&
      currentUser.role !== Role.TENANT_OWNER
    ) {
      throw new ForbiddenException('Tidak dapat mereset PIN Owner');
    }

    const pin = generatePin();
    const pinHash = await bcrypt.hash(pin, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { pin: pinHash },
    });

    return {
      pin,
      message:
        'PIN berhasil direset. Sampaikan PIN ini ke staf untuk otorisasi aksi kasir.',
    };
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
