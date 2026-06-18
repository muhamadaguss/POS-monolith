const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface LogEntry {
  level: 'error' | 'warn' | 'info';
  message: string;
  service: 'frontend';
  environment: string;
  url?: string;
  userAgent?: string;
  stack?: string;
  requestId?: string;
}

/**
 * Kirim error / event dari browser ke backend proxy → Loki.
 *
 * Menggunakan endpoint proxy `POST /api/v1/logs/client` di backend
 * (tidak butuh auth) agar browser tidak perlu akses langsung ke Loki.
 * Fire-and-forget — gagal mengirim tidak akan memengaruhi UX.
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  if (!API_URL) return;

  const entry: LogEntry = {
    level: 'error',
    message: error instanceof Error ? error.message : String(error),
    service: 'frontend',
    environment: process.env.NODE_ENV ?? 'development',
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent:
      typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  // Fire-and-forget — tidak boleh gagalkan UX
  fetch(`${API_URL}/logs/client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      streams: [
        {
          stream: { service: 'frontend' },
          values: [
            [String(Date.now() * 1_000_000), JSON.stringify(entry)],
          ],
        },
      ],
    }),
  }).catch(() => {
    // Best-effort — kalau backend / Loki down, log hilang.
  });
}

/**
 * Kirim warning / info event dari browser ke Loki.
 * Contoh: logWarn('User session akan expired', { userId: auth.user?.id }).
 */
export function logWarn(message: string, context?: Record<string, unknown>) {
  if (!API_URL) return;

  fetch(`${API_URL}/logs/client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      streams: [
        {
          stream: { service: 'frontend' },
          values: [
            [
              String(Date.now() * 1_000_000),
              JSON.stringify({
                level: 'warn',
                message,
                service: 'frontend',
                environment: process.env.NODE_ENV ?? 'development',
                ...context,
              }),
            ],
          ],
        },
      ],
    }),
  }).catch(() => {});
}
