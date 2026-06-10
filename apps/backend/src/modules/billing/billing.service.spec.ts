import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';

describe('BillingService — pay', () => {
  let service: BillingService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [BillingService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BillingService);
  });

  it('menolak invoice yang tidak ditemukan / milik tenant lain', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    await expect(service.pay('tenant-1', 'inv-x')).rejects.toThrow(NotFoundException);

    prisma.subscription.findUnique.mockResolvedValue({ id: 'inv-1', tenantId: 'tenant-OTHER' });
    await expect(service.pay('tenant-1', 'inv-1')).rejects.toThrow(NotFoundException);
  });

  it('menolak invoice yang sudah dibayar', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: 'inv-1',
      tenantId: 'tenant-1',
      isPaid: true,
    });
    await expect(service.pay('tenant-1', 'inv-1')).rejects.toThrow(BadRequestException);
  });

  it('membayar invoice & mengaktifkan paket', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: 'inv-1',
      tenantId: 'tenant-1',
      isPaid: false,
      plan: 'STARTER',
    });
    prisma.subscription.update.mockResolvedValue({
      id: 'inv-1',
      isPaid: true,
      paidAt: new Date(),
      invoiceRef: 'INV-X',
    });
    prisma.tenant.update.mockResolvedValue({});

    const result = await service.pay('tenant-1', 'inv-1');

    expect(result.isPaid).toBe(true);
    // paket diaktifkan ke tenant
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tenant-1' } }),
    );
  });
});
