import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role, ProductStatus } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

const owner: AuthenticatedUser = {
  userId: 'owner-1',
  tenantId: 'tenant-1',
  role: Role.TENANT_OWNER,
  currentOutletId: null,
  permissions: ['product.manage'],
} as AuthenticatedUser;

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  describe('create', () => {
    const baseDto = { name: 'Es Teh', sku: 'ET-001' } as any;

    it('menolak SKU yang sudah dipakai', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create(baseDto, owner)).rejects.toThrow(ConflictException);
    });

    it('menolak kategori yang tidak ditemukan', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ ...baseDto, categoryId: 'cat-x' }, owner),
      ).rejects.toThrow(NotFoundException);
    });

    it('menolak hasVariants tanpa varian', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ ...baseDto, hasVariants: true, variants: [] }, owner),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak SKU varian duplikat', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.create(
          {
            ...baseDto,
            variants: [
              { name: 'S', sku: 'DUP' },
              { name: 'M', sku: 'DUP' },
            ],
          },
          owner,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('membuat produk valid', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 'prod-1', name: 'Es Teh' });
      const result = await service.create(baseDto, owner);
      expect(result).toHaveProperty('id', 'prod-1');
    });
  });

  describe('remove', () => {
    it('soft-delete (status DELETED) bila produk sudah punya transaksi', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        _count: { transactionItems: 5 },
      });
      prisma.product.update.mockResolvedValue({ id: 'prod-1', status: ProductStatus.DELETED });

      const result = await service.remove('prod-1', owner);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: ProductStatus.DELETED } }),
      );
      expect(prisma.product.delete).not.toHaveBeenCalled();
      expect(result).toHaveProperty('status', ProductStatus.DELETED);
    });

    it('hard-delete bila belum ada transaksi', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        _count: { transactionItems: 0 },
      });
      prisma.product.delete.mockResolvedValue({});

      const result = await service.remove('prod-1', owner);

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
      expect(result).toHaveProperty('message');
    });

    it('melempar NotFound bila produk tak ada', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.remove('nope', owner)).rejects.toThrow(NotFoundException);
    });
  });
});
