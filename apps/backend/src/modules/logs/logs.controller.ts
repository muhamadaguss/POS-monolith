import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAuditLog } from '../../common/decorators/skip-audit-log.decorator';

/**
 * Reverse proxy untuk client-side log ingestion → Loki Push API.
 *
 * Browser frontend tidak bisa langsung POST ke Loki (internal Docker network).
 * Endpoint ini menerima payload Loki Push API dari browser dan meneruskannya
 * ke `http://loki:3100/loki/api/v1/push`.
 *
 * - @Public() — tidak butuh token JWT (log best-effort dari browser anonim).
 * - @SkipAuditLog() — jangan banjiri tabel AuditLog.
 * - Fire-and-forget response — tidak tunggu Loki, selalu return 202 Accepted.
 */
@ApiTags('Logs')
@Public()
@SkipAuditLog()
@Controller('logs')
export class LogsController {
  private readonly logger = new Logger(LogsController.name);
  private readonly LOKI_PUSH_URL = 'http://loki:3100/loki/api/v1/push';

  @Post('client')
  @ApiOperation({ summary: 'Terima client-side log → forward ke Loki' })
  async ingest(@Body() payload: unknown) {
    // Fire-and-forget: forward ke Loki, tapi jangan block response.
    // Kalau Loki down, log hilang — acceptable (log client-side adalah
    // best-effort, bukan data kritis).
    this.forwardToLoki(payload).catch((err) => {
      this.logger.warn(`Gagal forward log ke Loki: ${(err as Error).message}`);
    });

    // Selalu return 202 — client tidak perlu tahu hasil forwarding.
    return { accepted: true };
  }

  private async forwardToLoki(payload: unknown) {
    const response = await fetch(this.LOKI_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Loki returned ${response.status}: ${text.slice(0, 200)}`);
    }
  }
}
