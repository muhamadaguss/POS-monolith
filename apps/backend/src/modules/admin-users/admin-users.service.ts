import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUserQueryDto, AssignableRole } from './dto/admin-user.dto';

/** Field user yang aman diekspos (TANPA passwordHash/pin). */
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  tenantId: true,
  lastLoginAt: true,
  mustChangePassword: true,
  createdAt: true,
  tenant: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  /** Daftar SEMUA user lintas-platform (khusus Super Admin) — tanpa filter tenantId. */
  async findAll(query: AdminUserQueryDto) {
    const { search, role, status, tenantId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(status && { status }),
      ...(tenantId && { tenantId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Detail satu user + peran per-outlet. */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        outletRoles: {
          select: { role: true, outlet: { select: { id: true, name: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  /** Aktif/nonaktifkan user. Tak boleh menonaktifkan diri sendiri. */
  async updateStatus(adminId: string, id: string, status: UserStatus) {
    if (id === adminId) {
      throw new BadRequestException('Tidak dapat mengubah status akun Anda sendiri');
    }
    const target = await this.ensureExists(id);
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Tidak dapat mengubah Super Admin lain');
    }
    await this.prisma.user.update({ where: { id }, data: { status } });
    return this.findOne(id);
  }

  /** Ubah role tenant. Larang menyentuh/menjadikan SUPER_ADMIN & diri sendiri. */
  async updateRole(adminId: string, id: string, role: AssignableRole) {
    if (id === adminId) {
      throw new BadRequestException('Tidak dapat mengubah role akun Anda sendiri');
    }
    const target = await this.ensureExists(id);
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Tidak dapat mengubah Super Admin lain');
    }
    // role sudah dibatasi enum AssignableRole (tanpa SUPER_ADMIN) di DTO.
    await this.prisma.user.update({ where: { id }, data: { role: role as Role } });
    return this.findOne(id);
  }

  /**
   * Reset password: generate password kuat acak, set hash + mustChangePassword=true,
   * dan REVOKE semua refresh token user (agar sesi hidup tak bisa bypass force-change).
   * Mengembalikan plaintext SEKALI untuk disampaikan admin ke user.
   */
  async resetPassword(adminId: string, id: string) {
    if (id === adminId) {
      throw new BadRequestException('Gunakan menu Ganti Password untuk akun Anda sendiri');
    }
    const target = await this.ensureExists(id);
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Tidak dapat mereset password Super Admin lain');
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      password,
      message: 'Password berhasil direset. Sampaikan password ini ke user; user wajib menggantinya saat login.',
    };
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }
}

/**
 * Password acak kuat yang memenuhi kompleksitas (huruf besar+kecil+angka).
 * 12 byte → base64url, lalu jamin minimal satu dari tiap kelas.
 */
function generatePassword(): string {
  const base = crypto.randomBytes(12).toString('base64url'); // ~16 char
  // Tempel suffix deterministik kelas-karakter agar selalu lolos validasi.
  return `${base}Aa1`;
}
