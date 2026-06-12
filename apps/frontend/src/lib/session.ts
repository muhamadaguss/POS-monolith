import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * Data Access Layer (DAL) untuk Server Components — sesuai anjuran dokumen Next.js
 * (`authentication.md` / `proxy.md`): verifikasi auth dilakukan SEDEKAT MUNGKIN ke
 * data, BUKAN hanya mengandalkan proxy (proxy = optimistic redirect saja).
 *
 * Pakai dari Server Component / Route Handler:
 *   const data = await serverFetch<MyType>('/reports/summary?outletId=...');
 * `serverFetch` otomatis memverifikasi sesi & menyuntik Bearer token backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Verifikasi sesi. Mengembalikan session bila valid; redirect ke /login bila tidak.
 * Di-memoize per-request (React `cache`) → aman dipanggil berkali-kali dalam satu render.
 */
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user || session.error === 'RefreshTokenError') {
    redirect('/login');
  }
  return session;
});

/** Sesi tanpa redirect (untuk pengecekan opsional, mis. di proxy/layout). */
export const getSession = cache(async () => auth());

/** Access token backend dari sesi terverifikasi (untuk header Bearer). */
export async function getBackendToken(): Promise<string> {
  const session = await verifySession();
  const token = session.backendAccessToken;
  if (!token) redirect('/login');
  return token;
}

/** Unwrap envelope backend `{ success, data, timestamp }` → `data`. */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export class ServerFetchError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Fetch ke backend dari server, dgn auth Bearer + unwrap envelope.
 * - Memverifikasi sesi lebih dulu (DAL).
 * - 401 → redirect /login (token tak lagi sah; refresh ditangani Auth.js sebelum ini).
 * - `cache: 'no-store'` default agar data POS/laporan selalu segar (bisa di-override).
 */
export async function serverFetch<T>(
  path: string,
  init?: RequestInit & { cache?: RequestCache },
): Promise<T> {
  const token = await getBackendToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: init?.cache ?? 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    redirect('/login');
  }
  if (!res.ok) {
    let message = `Request gagal (${res.status})`;
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      /* abaikan */
    }
    throw new ServerFetchError(res.status, message);
  }

  return unwrap<T>(await res.json());
}
