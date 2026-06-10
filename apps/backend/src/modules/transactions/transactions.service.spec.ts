import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Role, TransactionStatus, StockMutationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

const cashier: AuthenticatedUser = {
  userId: 'cashier-1',
  tenantId: 'tenant-1',
  role: Role.CASHIER,
  currentOutletId: 'outlet-1',
  permissions: ['pos.transaction'],
} as AuthenticatedUser;

function buildTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trx-1',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    receiptNumber: 'TRX-0001',
    status: TransactionStatus.COMPLETED,
    totalAmount: new Decimal(20000),
    items: [
      { productId: 'prod-1', variantId: null, quantity: new Decimal(2) },
    ],
    outlet: { id: 'outlet-1', name: 'Outlet 1' },
    ...overrides,
  };
}

describe('TransactionsService — void & refund', () => {
  let service: TransactionsService;
  let prisma: MockPrisma;
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = { log: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ShiftsService, useValue: { requireActiveShift: jest.fn() } },
        { provide: AuditLogsService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);

    // Manager dengan PIN '123456' yang berhak otorisasi (Owner → tanpa cek outlet)
    prisma.user.findMany.mockResolvedValue([
      { id: 'mgr-1', pin: await bcrypt.hash('123456', 10), role: Role.TENANT_OWNER },
    ]);
    // Default inventory ditemukan
    prisma.inventory.findFirst.mockResolvedValue({
      id: 'inv-1',
      quantity: new Decimal(10),
    });
    prisma.inventory.update.mockResolvedValue({});
    prisma.stockMutation.create.mockResolvedValue({});
    prisma.transaction.update.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'trx-1', ...args.data }),
    );
  });

  describe('voidTransaction', () => {
    it('mengembalikan stok dan menandai VOIDED dengan PIN benar', async () => {
      prisma.transaction.findFirst.mockResolvedValue(buildTransaction());

      const result = await service.voidTransaction(
        'trx-1',
        { voidReason: 'Salah input', managerPin: '123456' },
        cashier,
      );

      // stok dikembalikan: 10 + 2 = 12
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: new Decimal(12) } }),
      );
      // mutasi RETURN tercatat
      expect(prisma.stockMutation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: StockMutationType.RETURN }),
        }),
      );
      // status jadi VOIDED
      expect(result.status).toBe(TransactionStatus.VOIDED);
      // audit log dipanggil
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TRANSACTION_VOID' }),
      );
    });

    it('menolak PIN manager yang salah', async () => {
      prisma.transaction.findFirst.mockResolvedValue(buildTransaction());

      await expect(
        service.voidTransaction('trx-1', { voidReason: 'x', managerPin: '000000' }, cashier),
      ).rejects.toThrow(UnauthorizedException);

      // tidak boleh menyentuh stok bila PIN gagal
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });

    it('menolak transaksi yang sudah di-void', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        buildTransaction({ status: TransactionStatus.VOIDED }),
      );

      await expect(
        service.voidTransaction('trx-1', { voidReason: 'x', managerPin: '123456' }, cashier),
      ).rejects.toThrow(BadRequestException);
    });

    it('melempar NotFound bila transaksi tak ada', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.voidTransaction('nope', { voidReason: 'x', managerPin: '123456' }, cashier),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('refundTransaction', () => {
    it('mengembalikan stok dan menandai REFUNDED dengan PIN benar', async () => {
      prisma.transaction.findFirst.mockResolvedValue(buildTransaction());

      const result = await service.refundTransaction(
        'trx-1',
        { refundReason: 'Barang dikembalikan', managerPin: '123456' },
        cashier,
      );

      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: new Decimal(12) } }),
      );
      expect(prisma.stockMutation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: StockMutationType.RETURN }),
        }),
      );
      expect(result.status).toBe(TransactionStatus.REFUNDED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TRANSACTION_REFUND' }),
      );
    });

    it('menolak refund transaksi yang sudah di-void', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        buildTransaction({ status: TransactionStatus.VOIDED }),
      );

      await expect(
        service.refundTransaction('trx-1', { refundReason: 'x', managerPin: '123456' }, cashier),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak refund transaksi yang sudah di-refund', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        buildTransaction({ status: TransactionStatus.REFUNDED }),
      );

      await expect(
        service.refundTransaction('trx-1', { refundReason: 'x', managerPin: '123456' }, cashier),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak PIN manager yang salah', async () => {
      prisma.transaction.findFirst.mockResolvedValue(buildTransaction());

      await expect(
        service.refundTransaction('trx-1', { refundReason: 'x', managerPin: '999999' }, cashier),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });
  });
});
