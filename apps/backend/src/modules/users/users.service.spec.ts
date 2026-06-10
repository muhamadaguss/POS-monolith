import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
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
    const dto = {
      name: 'Budi',
      email: 'budi@toko.com',
      password: 'Secret123!',
      role: 'CASHIER',
      outletId: 'outlet-1',
      pin: '123456',
    } as any;

    it('menolak outlet yang tidak ditemukan', async () => {
      prisma.outlet.findFirst.mockResolvedValue(null);
      await expect(service.create(dto, owner)).rejects.toThrow(NotFoundException);
    });

    it('menolak email yang sudah terdaftar', async () => {
      prisma.outlet.findFirst.mockResolvedValue({ id: 'outlet-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto, owner)).rejects.toThrow(ConflictException);
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
      expect(created.passwordHash).not.toBe('Secret123!');
      expect(created.pin).not.toBe('123456');
      // dan hash-nya valid
      await expect(bcrypt.compare('Secret123!', created.passwordHash)).resolves.toBe(true);
      await expect(bcrypt.compare('123456', created.pin)).resolves.toBe(true);
    });
  });
});
