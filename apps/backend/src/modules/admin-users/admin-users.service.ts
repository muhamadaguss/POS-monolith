import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { generatePassword } from '../../common/utils/credential.util';
import {
  AdminUserQueryDto,
  AssignableRole,
  CreateUserDto,
} from './dto/admin-user.dto';

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

  /** Statistik user lintas-platform untuk KPI (Total/Aktif/Manajer/Kasir). */
  async getStats() {
    const [total, active, managers, cashiers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { role: Role.STORE_MANAGER } }),
      this.prisma.user.count({ where: { role: Role.CASHIER } }),
    ]);
    return { total, active, managers, cashiers };
  }

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
      throw new BadRequestException(
        'Tidak dapat mengubah status akun Anda sendiri',
      );
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
      throw new BadRequestException(
        'Tidak dapat mengubah role akun Anda sendiri',
      );
    }
    const target = await this.ensureExists(id);
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Tidak dapat mengubah Super Admin lain');
    }
    // role sudah dibatasi enum AssignableRole (tanpa SUPER_ADMIN) di DTO.
    await this.prisma.user.update({
      where: { id },
      data: { role: role },
    });
    return this.findOne(id);
  }

  /**
   * Reset password: generate password kuat acak, set hash + mustChangePassword=true,
   * dan REVOKE semua refresh token user (agar sesi hidup tak bisa bypass force-change).
   * Mengembalikan plaintext SEKALI untuk disampaikan admin ke user.
   */
  async resetPassword(adminId: string, id: string) {
    if (id === adminId) {
      throw new BadRequestException(
        'Gunakan menu Ganti Password untuk akun Anda sendiri',
      );
    }
    const target = await this.ensureExists(id);
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Tidak dapat mereset password Super Admin lain',
      );
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
      message:
        'Password berhasil direset. Sampaikan password ini ke user; user wajib menggantinya saat login.',
    };
  }

  /**
   * Buat user baru di sebuah tenant (Super Admin). Role dibatasi role tenant
   * (AssignableRole — tanpa SUPER_ADMIN). Password di-generate & dikembalikan
   * SEKALI; user wajib menggantinya saat login pertama (mustChangePassword=true).
   * Memvalidasi tenant ada, email unik, dan batas staf paket tenant.
   */
  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      select: { id: true, maxStaff: true },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    const emailTaken = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (emailTaken) throw new ConflictException('Email sudah terdaftar.');

    // Batas staf paket tenant (hitung user non-INACTIVE).
    const activeStaff = await this.prisma.user.count({
      where: { tenantId: tenant.id, status: { not: UserStatus.INACTIVE } },
    });
    if (activeStaff >= tenant.maxStaff) {
      throw new BadRequestException(
        `Batas staf paket tenant tercapai (${tenant.maxStaff}). Tingkatkan paket untuk menambah staf.`,
      );
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: dto.name.trim(),
        email,
        phone: dto.phone?.trim() || null,
        passwordHash,
        role: dto.role,
        status: UserStatus.ACTIVE,
        mustChangePassword: true,
      },
      select: USER_SELECT,
    });

    return {
      user,
      // Plaintext SEKALI untuk disampaikan; tak disimpan (audit tak menangkap body).
      password,
      message:
        'User berhasil dibuat. Sampaikan password ini — user wajib menggantinya saat login pertama.',
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
