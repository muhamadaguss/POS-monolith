/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock PrismaService untuk unit test (tanpa database).
 *
 * Tiap delegate model punya method jest.fn() yang umum dipakai. `$transaction`
 * dibuat menjalankan callback dengan instance mock yang sama (interactive-tx),
 * atau me-resolve array promise (batch-tx) — meniru perilaku Prisma asli.
 *
 * Memakai global `jest` (dari ts-jest) sehingga `jest.fn()` longgar tipenya
 * dan `mockResolvedValue(...)` menerima objek apa pun.
 */

const MODELS = [
  'tenant',
  'subscription',
  'user',
  'userOutletRole',
  'refreshToken',
  'outlet',
  'category',
  'product',
  'productVariant',
  'outletPrice',
  'inventory',
  'stockMutation',
  'stockAdjustment',
  'stockAdjustmentItem',
  'stockTransfer',
  'stockTransferItem',
  'shift',
  'discount',
  'transaction',
  'transactionItem',
  'auditLog',
] as const;

const DELEGATE_METHODS = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
] as const;

export type MockDelegate = Record<(typeof DELEGATE_METHODS)[number], jest.Mock>;
export type MockPrisma = Record<(typeof MODELS)[number], MockDelegate> & {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
};

export function createMockPrisma(): MockPrisma {
  const prisma: any = {};

  for (const model of MODELS) {
    const delegate: any = {};
    for (const method of DELEGATE_METHODS) {
      delegate[method] = jest.fn();
    }
    prisma[model] = delegate;
  }

  // $transaction:
  //  - dengan callback (interactive): jalankan callback memakai prisma mock yang sama
  //  - dengan array (batch): resolve semua promise
  prisma.$transaction = jest.fn((arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  prisma.$connect = jest.fn();
  prisma.$disconnect = jest.fn();
  prisma.$queryRaw = jest.fn();
  prisma.$executeRaw = jest.fn();

  return prisma as MockPrisma;
}
