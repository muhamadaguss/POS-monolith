import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAuditLog } from '../../common/decorators/skip-audit-log.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Endpoint kesehatan untuk monitoring/uptime & orkestrator (probe).
 *
 * - `@Public()`    → lewati JwtAuthGuard (probe tak punya token).
 * - `@SkipAuditLog()` → jangan banjiri tabel AuditLog (probe sangat sering).
 * - `@SkipThrottle()` → uptime monitor yang ping rutin tak boleh kena rate-limit.
 *
 * GET /api/v1/health        → LIVENESS: proses hidup (tanpa sentuh DB).
 * GET /api/v1/health/ready  → READINESS: DB tersambung (200) / tidak (503).
 */
@ApiTags('Health')
@Public()
@SkipAuditLog()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly indicator: HealthIndicatorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness — proses aplikasi hidup (tanpa cek DB)' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness — aplikasi + database siap melayani' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.checkDatabase()]);
  }

  /** Indikator DB: jalankan query ringan `SELECT 1` lewat Prisma. */
  private async checkDatabase() {
    const check = this.indicator.check('database');
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return check.up();
    } catch (error) {
      return check.down({
        message:
          error instanceof Error ? error.message : 'Database tidak tersedia',
      });
    }
  }
}
