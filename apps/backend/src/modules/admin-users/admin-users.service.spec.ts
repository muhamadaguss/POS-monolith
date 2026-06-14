import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import { AssignableRole } from './dto/admin-user.dto';

/**
 * Fokus: query lintas-tenant + self-protection (tak sentuh diri/Super Admin lain) +
 * reset-password (set mustChangePassword + revoke token + balikan plaintext).
 */
describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: MockPrisma;
  const ADMIN_ID = 'sa-self';

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(AdminUsersService);
  });

  describe('findAll — lintas-tenant', () => {
    it('tidak memfilter tenantId secara default; balikan items+meta', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      prisma.user.count.mockResolvedValue(2);

      const res = await service.findAll({ page: 1, limit: 20 });

      expect(res.items).toHaveLength(2);
      expect(res.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
      // where tak boleh mengandung tenantId saat filter tak diberikan
      const arg = prisma.user.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(arg.where.tenantId).toBeUndefined();
    });

    it('menerapkan filter tenantId bila diberikan', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
      await service.findAll({ tenantId: 't1', page: 1, limit: 20 });
      const arg = prisma.user.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(arg.where.tenantId).toBe('t1');
    });
  });

  describe('updateStatus', () => {
    it('tolak mengubah diri sendiri', async () => {
      await expect(
        service.updateStatus(ADMIN_ID, ADMIN_ID, UserStatus.INACTIVE),
      ).rejects.toThrow(BadRequestException);
    });

    it('tolak menyentuh SUPER_ADMIN lain', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'sa2', role: Role.SUPER_ADMIN });
      await expect(
        service.updateStatus(ADMIN_ID, 'sa2', UserStatus.INACTIVE),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('sukses untuk user tenant biasa', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', role: Role.CASHIER }) // ensureExists
        .mockResolvedValueOnce({ id: 'u1', status: UserStatus.INACTIVE }); // findOne
      prisma.user.update.mockResolvedValue({});
      await service.updateStatus(ADMIN_ID, 'u1', UserStatus.INACTIVE);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { status: UserStatus.INACTIVE },
      });
    });
  });

  describe('updateRole', () => {
    it('tolak diri sendiri', async () => {
      await expect(
        service.updateRole(ADMIN_ID, ADMIN_ID, AssignableRole.CASHIER),
      ).rejects.toThrow(BadRequestException);
    });

    it('tolak menyentuh SUPER_ADMIN lain', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'sa2', role: Role.SUPER_ADMIN });
      await expect(
        service.updateRole(ADMIN_ID, 'sa2', AssignableRole.STORE_MANAGER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sukses set role tenant', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', role: Role.CASHIER })
        .mockResolvedValueOnce({ id: 'u1', role: Role.STORE_MANAGER });
      prisma.user.update.mockResolvedValue({});
      await service.updateRole(ADMIN_ID, 'u1', AssignableRole.STORE_MANAGER);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { role: 'STORE_MANAGER' },
      });
    });
  });

  describe('resetPassword', () => {
    it('tolak reset diri sendiri', async () => {
      await expect(service.resetPassword(ADMIN_ID, ADMIN_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tolak reset SUPER_ADMIN lain', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'sa2', role: Role.SUPER_ADMIN });
      await expect(service.resetPassword(ADMIN_ID, 'sa2')).rejects.toThrow(ForbiddenException);
    });

    it('sukses: set mustChangePassword + revoke token + balikan plaintext', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.CASHIER });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.resetPassword(ADMIN_ID, 'u1');

      expect(typeof res.password).toBe('string');
      expect(res.password.length).toBeGreaterThan(8);
      // memenuhi kompleksitas (huruf besar+kecil+angka)
      expect(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(res.password)).toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ mustChangePassword: true }),
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
      );
    });
  });
});
