import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

/**
 * Token holder untuk axios (Client Component).
 *
 * Auth.js menyimpan token backend di session (cookie HttpOnly) — tak terbaca
 * JavaScript. Komponen `AuthTokenSync` (dipasang di SessionProvider) menyalin
 * `session.backendAccessToken` ke variabel modul ini setiap sesi berubah, agar
 * request interceptor (sinkron) bisa menyuntik Bearer.
 *
 * Refresh token TIDAK ada di klien lagi — rotasi ditangani Auth.js di server.
 * Maka SEMUA mesin single-flight/cross-tab/rotasi manual yang dulu di sini
 * sudah DIHAPUS (penyebab historis bug "401 setelah sleep" kini tak relevan).
 */
let currentAccessToken: string | null = null;

/** Dipanggil AuthTokenSync saat session berubah. */
export function setApiAccessToken(token: string | null): void {
  currentAccessToken = token;
}

// ── Compat shims (NO-OP; dipertahankan di model hybrid) ─────────────────────
/**
 * Dulu memicu refresh token manual. Kini NO-OP — refresh ditangani Auth.js di
 * server. Dipertahankan karena masih dipanggil dari layout & loader Client
 * Component (usePageFocus, shift, inventory). Aman dipanggil; tidak melakukan
 * apa-apa. Bukan kode mati — selama ada pemanggil client, biarkan ada.
 */
export async function proactiveRefresh(): Promise<void> {
  /* no-op: Auth.js mengelola refresh di server */
}

/** Compat: refresh token tak lagi terbaca di klien (server-only). Selalu null. */
export function getRefreshToken(): string | null {
  return null;
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (currentAccessToken && config.headers) {
    config.headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Unwrap envelope { success, data } → data.
    if (response.data && response.data.success === true && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    // 401 pada endpoint non-auth: session klien basi. Auth.js sudah merotasi di
    // server; klien cukup diarahkan ke /login (atau biarkan SessionProvider
    // me-refresh sesi). Jangan jalankan refresh manual lagi.
    if (error.response?.status === 401 && !original?.url?.includes('/auth/')) {
      redirectToLogin();
    }
    return Promise.reject(error);
  },
);
