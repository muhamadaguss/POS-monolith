'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/client-logger';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js App Router Global Error Boundary.
 *
 * Secara otomatis menangkap error yang tidak tertangani (uncaught) di
 * rendering React (Server & Client Components). Error akan:
 * 1. Dikirim ke Sentry (via @sentry/nextjs — auto-instrument).
 * 2. Dikirim ke Loki via backend proxy (client-logger.ts).
 *
 * Ditampilkan sebagai fallback UI dengan tombol "Coba Lagi".
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log ke Loki (backend proxy) — fire-and-forget.
    logError(error, {
      digest: error.digest,
      component: 'app/error.tsx (global boundary)',
    });
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        background: '#0f172a',
        color: '#f1f5f9',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        Terjadi Kesalahan
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '480px' }}>
        Maaf, terjadi kesalahan yang tidak terduga. Tim teknis telah
        menerima laporan ini secara otomatis.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.625rem 1.5rem',
          background: '#059669',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.9375rem',
          fontWeight: 600,
        }}
      >
        Coba Lagi
      </button>
    </div>
  );
}
