import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

/**
 * Health check (monitoring/uptime). PrismaService di-inject dari PrismaModule
 * global, jadi tak perlu di-import ulang di sini.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
