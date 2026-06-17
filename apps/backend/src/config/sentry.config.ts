import { registerAs } from '@nestjs/config';

/**
 * Konfigurasi Sentry (error tracking).
 *
 * DSN kosong = Sentry NONAKTIF (no-op) — aman untuk lokal & CI. Saat deploy,
 * cukup isi `SENTRY_DSN` di environment; tak perlu ubah kode.
 */
export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN ?? '',
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
}));
