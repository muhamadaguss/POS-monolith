import * as Sentry from '@sentry/node';
import { Logger } from '@nestjs/common';

const logger = new Logger('Sentry');

/**
 * Inisialisasi Sentry (error tracking). DIPANGGIL PALING AWAL di bootstrap,
 * sebelum NestFactory.create, agar instrumentasi terpasang sebelum modul lain.
 *
 * Bila `SENTRY_DSN` kosong → return early (no-op): aman untuk lokal & CI.
 * `Sentry.captureException` saat SDK tak diinit juga aman (no-op), jadi pemanggil
 * (mis. GlobalExceptionFilter) tak perlu cabang khusus.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN ?? '';
  if (!dsn) {
    logger.log('Sentry nonaktif (SENTRY_DSN kosong)');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  logger.log('Sentry aktif');
}
