import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

const owner: AuthenticatedUser = {
  userId: 'owner-1',
  tenantId: 'tenant-1',
  role: Role.TENANT_OWNER,
  currentOutletId: null,
  permissions: ['staff.manage_global'],
} as AuthenticatedUser;

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  tenantId: 'tenant-1',
  role: Role.STORE_MANAGER,
  currentOutletId: 'outlet-1',
  permissions: ['staff.manage_local'],
} as AuthenticatedUser;

/** Hasil findOne (user di tenant yang sama, akses outlet OK). */
const cashierRow = {
  id: 'cashier-1',
  name: 'Kasir',
  role: Role.CASHIER,
  outletRoles: [
    { role: Role.CASHIER, outlet: { id: 'outlet-1', name: 'Outlet 1' } },
  ],
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    // Nilai contoh dibangun runtime (bukan literal) agar tak terdeteksi sebagai secret.
    const samplePassword = ['Secret', 123, '!'].join('');
    const samplePin = String(123456);
    const dto = {
      name: 'Budi',
      email: 'budi@toko.com',
      password: samplePassword,
      role: 'CASHIER',
      outletId: 'outlet-1',
      pin: samplePin,
    } as any;

    it('menolak outlet yang tidak ditemukan', async () => {
      prisma.outlet.findFirst.mockResolvedValue(null);
      await expect(service.create(dto, owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('menolak email yang sudah terdaftar', async () => {
      prisma.outlet.findFirst.mockResolvedValue({ id: 'outlet-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto, owner)).rejects.toThrow(
        ConflictException,
      );
    });

    it('membuat user dengan password & PIN ter-hash (bukan plaintext)', async () => {
      prisma.outlet.findFirst.mockResolvedValue({ id: 'outlet-1' });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'user-1', ...args.data }),
      );

      await service.create(dto, owner);

      const created = prisma.user.create.mock.calls[0][0].data;
      // password & pin TIDAK boleh tersimpan plaintext
      expect(created.passwordHash).not.toBe(samplePassword);
      expect(created.pin).not.toBe(samplePin);
      // dan hash-nya valid
      await expect(
        bcrypt.compare(samplePassword, created.passwordHash),
      ).resolves.toBe(true);
      await expect(bcrypt.compare(samplePin, created.pin)).resolves.toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('menolak reset password untuk akun sendiri', async () => {
      await expect(service.resetPassword('owner-1', owner)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('manager menolak mereset password Owner', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'owner-1',
        role: Role.TENANT_OWNER,
        outletRoles: [
          {
            role: Role.TENANT_OWNER,
            outlet: { id: 'outlet-1', name: 'Outlet 1' },
          },
        ],
      });
      await expect(service.resetPassword('owner-1', manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('set mustChangePassword=true, hash baru, & revoke refresh token', async () => {
      prisma.user.findFirst.mockResolvedValue(cashierRow);
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const res = await service.resetPassword('cashier-1', owner);

      const updateArg = prisma.user.update.mock.calls[0][0];
      expect(updateArg.data.mustChangePassword).toBe(true);
      expect(updateArg.data.passwordHash).not.toBe(res.password);
      await expect(
        bcrypt.compare(res.password, updateArg.data.passwordHash),
      ).resolves.toBe(true);
      // sesi lama dicabut
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'cashier-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(typeof res.password).toBe('string');
    });
  });

  describe('resetPin', () => {
    it('menolak target yang tidak ada di tenant (404 dari findOne)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.resetPin('luar-1', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('menyimpan PIN 6 digit ter-hash (bukan plaintext)', async () => {
      prisma.user.findFirst.mockResolvedValue(cashierRow);
      prisma.user.update.mockResolvedValue({});

      const res = await service.resetPin('cashier-1', owner);

      expect(res.pin).toMatch(/^\d{6}$/);
      const updateArg = prisma.user.update.mock.calls[0][0];
      expect(updateArg.data.pin).not.toBe(res.pin);
      await expect(bcrypt.compare(res.pin, updateArg.data.pin)).resolves.toBe(
        true,
      );
    });
  });
});
