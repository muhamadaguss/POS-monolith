// Hook instrumentasi Next.js (App Router). `register()` memuat config Sentry
// sesuai runtime (Node/edge). `onRequestError` melaporkan error server-side
// (RSC, route handler, server action) ke Sentry. Semua no-op bila DSN kosong.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
