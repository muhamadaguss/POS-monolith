import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  describe('liveness', () => {
    it('selalu balas status ok tanpa menyentuh DB', () => {
      const res = controller.liveness();
      expect(res.status).toBe('ok');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('balas ok + indikator database up saat DB sehat', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const res = await controller.readiness();
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(res.status).toBe('ok');
      expect(res.details.database.status).toBe('up');
    });

    it('melempar (503) dengan indikator database down saat query DB gagal', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      await expect(controller.readiness()).rejects.toMatchObject({
        response: {
          status: 'error',
          details: { database: { status: 'down' } },
        },
      });
    });
  });
});
