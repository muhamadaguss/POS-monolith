import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';

/**
 * Modul proxy untuk client-side log ingestion.
 *
 * Frontend browser tidak bisa langsung mengakses Loki di internal Docker
 * network (`loki:3100`). Controller di modul ini bertindak sebagai reverse
 * proxy: menerima POST dari browser, lalu meneruskan ke Loki Push API
 * menggunakan native fetch (Node 22).
 *
 * Rate-limited secara global oleh ThrottlerGuard; tidak butuh autentikasi
 * (log client-side adalah best-effort, bukan data sensitif).
 */
@Module({
  controllers: [LogsController],
})
export class LogsModule {}

