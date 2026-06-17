// Konfigurasi Sentry untuk runtime BROWSER (client) — Next.js App Router.
// DSN kosong = NONAKTIF (init no-op). Lihat instrumentation.ts (server/edge).
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',
  environment: process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
});

// Wajib untuk instrumentasi navigasi App Router (transisi route).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
