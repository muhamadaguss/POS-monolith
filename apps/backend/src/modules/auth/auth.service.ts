import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';
import { SelectOutletDto } from './dto/select-outlet.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { JwtPayload, JwtRefreshPayload, AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { ROLE_DEFAULT_PERMISSIONS } from '../../common/rbac/permissions';
import { Role, UserStatus, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import ms from 'ms';
import type { StringValue } from 'ms';

type Duration = StringValue;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogsService: AuditLogsService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password, tenantSlug, outletId } = dto;

    // 1. Cari user berdasarkan email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) throw new UnauthorizedException('Email atau password salah');
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Akun Anda tidak aktif atau telah dikunci');
    }

    // 2. Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      void this.auditLogsService.log({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        newValue: { reason: 'wrong_password', email },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Email atau password salah');
    }

    // 3. Validasi tenant (Super Admin tidak perlu tenantSlug)
    if (user.role !== Role.SUPER_ADMIN) {
      if (!tenantSlug) throw new BadRequestException('Tenant slug wajib diisi');
      if (!user.tenant || user.tenant.slug !== tenantSlug) {
        throw new UnauthorizedException('Tenant tidak valid untuk akun ini');
      }
      if (user.tenant.status === TenantStatus.SUSPENDED) {
        throw new ForbiddenException('Akun bisnis Anda sedang ditangguhkan. Hubungi support.');
      }
    }

    // 4. Resolve role & permissions untuk outlet yang dipilih
    let resolvedRole = user.role;
    let resolvedOutletId: string | null = outletId ?? null;
    let permissions = ROLE_DEFAULT_PERMISSIONS[user.role];

    if (resolvedOutletId && user.tenantId) {
      const outletRole = await this.prisma.userOutletRole.findUnique({
        where: { userId_outletId: { userId: user.id, outletId: resolvedOutletId } },
        include: { outlet: { select: { tenantId: true, isActive: true } } },
      });

      if (!outletRole) throw new ForbiddenException('Anda tidak memiliki akses ke outlet ini');
      if (!outletRole.outlet.isActive) throw new ForbiddenException('Outlet ini sudah tidak aktif');
      if (outletRole.outlet.tenantId !== user.tenantId) {
        throw new ForbiddenException('Outlet tidak ditemukan di tenant ini');
      }

      resolvedRole = outletRole.role;
      permissions = ROLE_DEFAULT_PERMISSIONS[outletRole.role];
    }

    // 5. Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    void this.auditLogsService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      newValue: { role: resolvedRole, outletId: resolvedOutletId },
      ipAddress,
      userAgent,
    });

    // 6. Terbitkan token
    const { accessToken, refreshToken } = await this.generateTokens(
      { userId: user.id, email: user.email, tenantId: user.tenantId, currentOutletId: resolvedOutletId, role: resolvedRole, permissions: permissions as string[] },
      ipAddress,
      userAgent,
    );

    // 7. Ambil daftar outlet yang bisa diakses user (untuk halaman pilih cabang)
    const userOutletRoles = user.tenantId
      ? await this.prisma.userOutletRole.findMany({
          where: { userId: user.id, outlet: { isActive: true } },
          include: { outlet: { select: { id: true, name: true } } },
        })
      : [];

    const outlets = userOutletRoles.map((uor) => ({
      id: uor.outlet.id,
      name: uor.outlet.name,
      role: uor.role,
      permissions: ROLE_DEFAULT_PERMISSIONS[uor.role] as string[],
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: resolvedRole,
        tenantId: user.tenantId,
        currentOutletId: resolvedOutletId,
        permissions: permissions as string[],
        // Wajib ganti password (mis. setelah reset oleh Super Admin) → frontend
        // memaksa user ke /change-password sebelum bisa memakai aplikasi.
        mustChangePassword: user.mustChangePassword,
      },
      outlets,
      accessToken,
      refreshToken,
    };
  }

  // Dipakai saat user sudah login tapi ingin berpindah outlet aktif
  async selectOutlet(currentUser: AuthenticatedUser, dto: SelectOutletDto) {
    if (!currentUser.tenantId) throw new ForbiddenException('Super Admin tidak perlu memilih outlet');

    // TENANT_OWNER: boleh memilih outlet mana pun di tenant-nya TANPA harus punya
    // userOutletRole, dan TETAP mempertahankan role/permissions global Owner
    // (akses lintas-outlet tidak hilang, sekadar set outlet aktif untuk POS/shift).
    let resolvedRole: Role;
    let resolvedPermissions: string[];

    if (currentUser.role === Role.TENANT_OWNER) {
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: dto.outletId, tenantId: currentUser.tenantId },
        select: { isActive: true },
      });
      if (!outlet) throw new NotFoundException('Outlet tidak ditemukan');
      if (!outlet.isActive) throw new ForbiddenException('Outlet ini sudah tidak aktif');

      resolvedRole = Role.TENANT_OWNER;
      resolvedPermissions = ROLE_DEFAULT_PERMISSIONS[Role.TENANT_OWNER] as string[];
    } else {
      const outletRole = await this.prisma.userOutletRole.findUnique({
        where: { userId_outletId: { userId: currentUser.userId, outletId: dto.outletId } },
        include: { outlet: { select: { tenantId: true, isActive: true } } },
      });

      if (!outletRole) throw new ForbiddenException('Anda tidak memiliki akses ke outlet ini');
      if (!outletRole.outlet.isActive) throw new ForbiddenException('Outlet ini sudah tidak aktif');
      if (outletRole.outlet.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException('Outlet tidak ditemukan di tenant ini');
      }

      resolvedRole = outletRole.role;
      resolvedPermissions = ROLE_DEFAULT_PERMISSIONS[outletRole.role] as string[];
    }

    // Terbitkan PASANGAN token baru (access + refresh) dengan currentOutletId yang
    // benar. Penting: refresh token juga dirotasi agar saat access token expired,
    // rotateFrom membaca currentOutletId yang TEPAT (bukan outlet lama/null).
    // Tanpa ini, outlet aktif "loncat balik" 15 menit kemudian.
    const tokens = await this.generateTokens({
      userId: currentUser.userId,
      email: currentUser.email,
      tenantId: currentUser.tenantId,
      currentOutletId: dto.outletId,
      role: resolvedRole,
      permissions: resolvedPermissions,
    });

    // Cabut refresh token lama (yang masih membawa outlet lama) bila dikirim,
    // agar tidak ada dua refresh token aktif yang menunjuk outlet berbeda.
    if (dto.refreshToken) {
      const oldHash = this.hashToken(dto.refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId: currentUser.userId, tokenHash: oldHash, revokedAt: null },
        data: { revokedAt: new Date(), replacedByTokenId: tokens.tokenId },
      });
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      currentOutletId: dto.outletId,
      role: resolvedRole,
      permissions: resolvedPermissions,
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau sudah kedaluwarsa');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { id: payload.tokenId, userId: payload.sub, tokenHash },
      include: { user: { include: { tenant: true } } },
    });

    // Token tidak ditemukan sama sekali atau benar-benar kedaluwarsa → tolak.
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token tidak valid. Silakan login kembali.');
    }

    const { user } = storedToken;
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    // Token sudah dirotasi (revoked). Bedakan race jaringan yang sah dari serangan reuse.
    if (storedToken.revokedAt) {
      const ageMs = Date.now() - storedToken.revokedAt.getTime();
      const GRACE_MS = 30_000;

      // Grace-window: token baru saja dirotasi dan anaknya masih hidup → ini
      // kemungkinan besar request paralel yang sah (mis. desktop bangun dari
      // sleep). Terbitkan ulang dari token anak, JANGAN revoke seluruh sesi.
      if (storedToken.replacedByTokenId && ageMs <= GRACE_MS) {
        const child = await this.prisma.refreshToken.findFirst({
          where: { id: storedToken.replacedByTokenId, revokedAt: null },
        });
        if (child) {
          // Anak masih aktif: rotasi dari anak ini agar klien tetap sinkron.
          return this.rotateFrom(child.id, user, payload.currentOutletId ?? null);
        }
      }

      // Di luar grace-window atau anak sudah ikut dirotasi/revoked → anggap
      // reuse berbahaya: cabut semua token user ini.
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token tidak valid. Silakan login kembali.');
    }

    return this.rotateFrom(storedToken.id, user, payload.currentOutletId ?? null);
  }

  // Rotasi: revoke token `parentTokenId`, terbitkan token baru, dan tautkan
  // keduanya lewat replacedByTokenId untuk mendukung grace-window.
  private async rotateFrom(
    parentTokenId: string,
    user: { id: string; email: string; tenantId: string | null; role: Role },
    outletId: string | null,
  ) {
    // Resolve role & permissions untuk outlet yang tersimpan di refresh token.
    let resolvedRole = user.role;
    let resolvedPermissions = ROLE_DEFAULT_PERMISSIONS[user.role];

    // PENTING: Owner (dan Super Admin) TIDAK boleh diturunkan ke role per-outlet.
    // Owner beroperasi lintas-outlet dengan permissions global; memilih outlet
    // hanya menyetel outlet aktif. Tanpa guard ini, Owner yang kebetulan punya
    // baris userOutletRole akan ter-demote jadi STORE_MANAGER saat token dirotasi.
    const keepsGlobalRole = user.role === Role.TENANT_OWNER || user.role === Role.SUPER_ADMIN;

    if (!keepsGlobalRole && outletId && user.tenantId) {
      const outletRole = await this.prisma.userOutletRole.findUnique({
        where: { userId_outletId: { userId: user.id, outletId } },
        include: { outlet: { select: { isActive: true } } },
      });
      if (outletRole?.outlet.isActive) {
        resolvedRole = outletRole.role;
        resolvedPermissions = ROLE_DEFAULT_PERMISSIONS[outletRole.role];
      }
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      currentOutletId: outletId,
      role: resolvedRole,
      permissions: resolvedPermissions as string[],
    });

    // Cabut parent dan tautkan ke anak yang baru dibuat.
    await this.prisma.refreshToken.update({
      where: { id: parentTokenId },
      data: { revokedAt: new Date(), replacedByTokenId: tokens.tokenId },
    });

    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash },
        data: { revokedAt: new Date() },
      });
    } else {
      // Logout dari semua device
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
    }

    void this.auditLogsService.log({
      userId,
      action: 'USER_LOGOUT',
      resource: 'User',
      resourceId: userId,
      newValue: { allDevices: !refreshToken },
    });

    return { message: 'Berhasil logout' };
  }

  /**
   * Ganti password mandiri (semua role). Verifikasi password lama, lalu set hash
   * baru + clear `mustChangePassword`. Dipakai juga untuk menuntaskan alur
   * force-change setelah Super Admin mereset password user.
   */
  async changePassword(currentUser: AuthenticatedUser, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    const isOldValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isOldValid) throw new UnauthorizedException('Password lama salah');

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('Password baru harus berbeda dari password lama');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return { message: 'Password berhasil diubah' };
  }

  // ---------- helpers ----------

  private async generateTokens(
    data: { userId: string; email: string; tenantId: string | null; currentOutletId: string | null; role: Role; permissions: string[] },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = await this.signAccessToken(data);

    // Buat refresh token dengan ID unik
    const tokenId = crypto.randomUUID();
    const refreshExpiresIn = this.refreshExpiresIn();
    const refreshToken = this.jwtService.sign(
      { sub: data.userId, tokenId, currentOutletId: data.currentOutletId } as JwtRefreshPayload,
      { secret: this.configService.get<string>('jwt.refreshSecret'), expiresIn: refreshExpiresIn },
    );

    // expiresAt baris DB dihitung dari durasi yang sama dengan JWT agar sinkron
    // (mencegah token DB & klaim `exp` JWT kedaluwarsa di waktu berbeda).
    const refreshTtlMs: number = ms(refreshExpiresIn);
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: data.userId,
        tokenHash: this.hashToken(refreshToken),
        ipAddress: ipAddress ?? null,
        deviceInfo: userAgent ?? null,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, tokenId };
  }

  private signAccessToken(data: {
    userId: string; email: string; tenantId: string | null;
    currentOutletId: string | null; role: Role; permissions: string[];
  }) {
    const payload: JwtPayload = {
      sub: data.userId,
      email: data.email,
      tenantId: data.tenantId,
      currentOutletId: data.currentOutletId,
      role: data.role,
      permissions: data.permissions,
    };
    return this.jwtService.signAsync(payload as object, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.accessExpiresIn(),
    });
  }

  /** Durasi access token dari config (env `JWT_ACCESS_EXPIRES_IN`, default `15m`). */
  private accessExpiresIn(): Duration {
    return (this.configService.get<string>('jwt.accessExpiresIn') ?? '15m') as Duration;
  }

  /** Durasi refresh token dari config (env `JWT_REFRESH_EXPIRES_IN`, default `7d`). */
  private refreshExpiresIn(): Duration {
    return (this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d') as Duration;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
