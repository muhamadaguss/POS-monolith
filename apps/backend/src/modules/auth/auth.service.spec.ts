import { Test } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

// Mock bcrypt agar compare/hash deterministik di test changePassword (tanpa hashing nyata).
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

/**
 * Fokus: refresh-token rotation + reuse-detection + grace-window.
 * Ini akar bug "selalu 401 setelah desktop sleep" yang berulang, jadi area
 * paling berharga untuk dijaga regresinya.
 */
describe('AuthService — refreshTokens (rotation & reuse)', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwt: { verify: jest.Mock; sign: jest.Mock; signAsync: jest.Mock };

  const activeUser = {
    id: 'user-1',
    email: 'u@toko.com',
    tenantId: 'tenant-1',
    role: Role.CASHIER,
    status: UserStatus.ACTIVE,
    tenant: { id: 'tenant-1', status: 'ACTIVE' },
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    jwt = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', tokenId: 'tok-1', currentOutletId: 'outlet-1' }),
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
      signAsync: jest.fn().mockResolvedValue('signed.access.token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);

    // generateTokens akan memanggil signAccessToken (jwt.sign) + refreshToken.create
    prisma.refreshToken.create.mockResolvedValue({ id: 'new-tok' });
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  it('rotasi token valid: revoke parent + terbitkan token baru', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'tok-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      replacedByTokenId: null,
      user: activeUser,
    });

    const result = await service.refreshTokens({ refreshToken: 'valid.token' });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    // parent di-revoke + ditautkan ke anak
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tok-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
  });

  it('menolak token yang tidak ditemukan', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    await expect(service.refreshTokens({ refreshToken: 'x' })).rejects.toThrow(UnauthorizedException);
  });

  it('menolak token kedaluwarsa', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'tok-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      user: activeUser,
    });
    await expect(service.refreshTokens({ refreshToken: 'x' })).rejects.toThrow(UnauthorizedException);
  });

  it('menolak user nonaktif', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'tok-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      user: { ...activeUser, status: UserStatus.INACTIVE },
    });
    await expect(service.refreshTokens({ refreshToken: 'x' })).rejects.toThrow(UnauthorizedException);
  });

  it('reuse di luar grace-window → cabut SEMUA token user', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'tok-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: new Date(Date.now() - 60_000), // 60s lalu (di luar grace 30s)
      replacedByTokenId: 'child-1',
      user: activeUser,
    });

    await expect(service.refreshTokens({ refreshToken: 'x' })).rejects.toThrow(UnauthorizedException);
    // seluruh sesi user dicabut
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('grace-window: token baru saja dirotasi & anak masih hidup → rotasi dari anak (tidak revoke-all)', async () => {
    prisma.refreshToken.findFirst
      // panggilan 1: token parent (sudah revoked, dalam grace)
      .mockResolvedValueOnce({
        id: 'tok-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: new Date(Date.now() - 5_000), // 5s lalu (dalam grace 30s)
        replacedByTokenId: 'child-1',
        user: activeUser,
      })
      // panggilan 2: cari anak yang masih aktif
      .mockResolvedValueOnce({ id: 'child-1', revokedAt: null });

    const result = await service.refreshTokens({ refreshToken: 'x' });

    expect(result).toHaveProperty('accessToken');
    // TIDAK boleh revoke seluruh sesi pada race yang sah
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});

/**
 * Fokus: TTL access/refresh token dibaca dari config (env), bukan hardcode.
 * Regresi guard untuk fix "JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN tak berefek".
 * Sebelumnya expiresIn di-hardcode '15m'/'7d' & expiresAt DB hardcode +7 hari.
 */
describe('AuthService — TTL token dari config', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwt: { verify: jest.Mock; sign: jest.Mock; signAsync: jest.Mock };

  const configMap: Record<string, string> = {
    'jwt.accessSecret': 'access-secret',
    'jwt.refreshSecret': 'refresh-secret',
    'jwt.accessExpiresIn': '30m',
    'jwt.refreshExpiresIn': '14d',
  };

  const activeUser = {
    id: 'user-1',
    email: 'u@toko.com',
    tenantId: 'tenant-1',
    role: Role.CASHIER,
    status: UserStatus.ACTIVE,
    tenant: { id: 'tenant-1', status: 'ACTIVE' },
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    jwt = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', tokenId: 'tok-1', currentOutletId: 'outlet-1' }),
      sign: jest.fn().mockReturnValue('signed.refresh.token'),
      signAsync: jest.fn().mockResolvedValue('signed.access.token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn((k: string) => configMap[k]) } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    prisma.refreshToken.create.mockResolvedValue({ id: 'new-tok' });
    prisma.refreshToken.update.mockResolvedValue({});
  });

  const validParent = {
    id: 'tok-1',
    userId: 'user-1',
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 86_400_000),
    revokedAt: null,
    replacedByTokenId: null,
    user: activeUser,
  };

  it('memakai expiresIn dari config untuk access (signAsync) & refresh (sign)', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(validParent);

    await service.refreshTokens({ refreshToken: 'valid.token' });

    // access token pakai jwt.accessExpiresIn
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ secret: 'access-secret', expiresIn: '30m' }),
    );
    // refresh token pakai jwt.refreshExpiresIn
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ secret: 'refresh-secret', expiresIn: '14d' }),
    );
  });

  it('expiresAt baris DB sinkron dgn durasi refresh dari config (14 hari, bukan hardcode 7)', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(validParent);

    // Tangkap expiresAt yang ditulis ke DB lewat implementasi mock (typed),
    // hindari akses `mock.calls[0][0]` yang ber-tipe `any`.
    let capturedExpiresAt: Date | undefined;
    prisma.refreshToken.create.mockImplementation(
      (args: { data: { expiresAt: Date } }) => {
        capturedExpiresAt = args.data.expiresAt;
        return Promise.resolve({ id: 'new-tok' });
      },
    );

    const before = Date.now();
    await service.refreshTokens({ refreshToken: 'valid.token' });

    const expiresAtMs = (capturedExpiresAt as Date).getTime();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    // toleransi ±5 detik untuk waktu eksekusi
    expect(expiresAtMs).toBeGreaterThan(before + fourteenDays - 5_000);
    expect(expiresAtMs).toBeLessThan(before + fourteenDays + 5_000);
  });
});

/**
 * Fokus: ganti password mandiri — verifikasi password lama, set hash baru, clear
 * mustChangePassword (menuntaskan alur force-change).
 */
describe('AuthService — changePassword', () => {
  let service: AuthService;
  let prisma: MockPrisma;

  const currentUser = {
    userId: 'user-1',
    email: 'u@toko.com',
    tenantId: 'tenant-1',
    currentOutletId: null,
    role: Role.CASHIER,
    permissions: [],
  } as AuthenticatedUser;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn(), signAsync: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'hash-lama',
      status: UserStatus.ACTIVE,
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
  });

  it('password lama salah → UnauthorizedException', async () => {
    mockedBcrypt.compare.mockResolvedValue(false as never);
    await expect(
      service.changePassword(currentUser, { oldPassword: 'Salah123', newPassword: 'Baru12345' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('password baru sama dgn lama → BadRequestException', async () => {
    mockedBcrypt.compare.mockResolvedValue(true as never);
    await expect(
      service.changePassword(currentUser, { oldPassword: 'Sama12345', newPassword: 'Sama12345' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('sukses → set hash baru + clear mustChangePassword', async () => {
    mockedBcrypt.compare.mockResolvedValue(true as never);
    mockedBcrypt.hash.mockResolvedValue('hash-baru' as never);

    const res = await service.changePassword(currentUser, {
      oldPassword: 'Lama12345',
      newPassword: 'Baru12345',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { passwordHash: 'hash-baru', mustChangePassword: false },
      }),
    );
    expect(res).toHaveProperty('message');
  });
});
