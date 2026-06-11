import { Test } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../../../test/prisma-mock';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [AuditLogsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditLogsService);
  });

  describe('log', () => {
    it('menyimpan audit log dengan default null untuk field opsional', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.log({ action: 'LOGIN', tenantId: 't1', userId: 'u1' });

      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const arg = prisma.auditLog.create.mock.calls[0][0];
      expect(arg.data.action).toBe('LOGIN');
      expect(arg.data.tenantId).toBe('t1');
      expect(arg.data.resource).toBeNull(); // tak diberikan → null
      expect(arg.data.ipAddress).toBeNull();
    });

    it('TIDAK melempar bila penyimpanan gagal (audit tak boleh menghentikan request)', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB down'));

      // Inti: error ditelan, promise resolve normal.
      await expect(service.log({ action: 'CREATE' })).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('membangun filter where dari query & melampirkan nama user', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 'l1', userId: 'u1', action: 'CREATE' },
        { id: 'l2', userId: null, action: 'LOGIN' },
      ]);
      prisma.auditLog.count.mockResolvedValue(2);
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', name: 'Andi' }]);

      const result = await service.findAll('tenant-1', {
        action: 'create',
        startDate: '2026-06-01',
        endDate: '2026-06-10',
        page: 1,
        limit: 50,
      });

      // where memuat tenantId + filter action (insensitive) + rentang tanggal.
      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.tenantId).toBe('tenant-1');
      expect(where.action).toEqual({ contains: 'create', mode: 'insensitive' });
      expect(where.createdAt).toBeDefined();

      // nama user terlampir; baris tanpa userId → null.
      expect(result.items[0].userName).toBe('Andi');
      expect(result.items[1].userName).toBeNull();
      expect(result.meta.totalPages).toBe(1);
    });

    it('SUPER_ADMIN lintas-tenant (tenantId null) tidak memfilter tenantId', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(null, {});

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('tenantId');
    });
  });
});
