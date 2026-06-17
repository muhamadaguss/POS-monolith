'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Error boundary ROOT — menangkap error yang lolos dari error.tsx per-segmen
 * (mis. error di root layout). Wajib me-render <html>/<body> sendiri karena
 * menggantikan seluruh root layout. Melaporkan error ke Sentry (no-op tanpa DSN).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            gap: '0.75rem',
          }}
        >
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
            Terjadi kesalahan
          </p>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
            Maaf, ada masalah yang tidak terduga. Silakan coba lagi.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
