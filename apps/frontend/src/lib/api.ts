import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

/**
 * Single-flight refresh.
 *
 * Hanya boleh ada SATU permintaan refresh ke backend pada satu waktu. Semua
 * pemanggil — baik proactiveRefresh() maupun response interceptor saat 401 —
 * menunggu promise yang SAMA. Ini mencegah refresh token (yang dirotasi backend)
 * terkirim dua kali secara paralel, yang akan memicu reuse-detection di backend
 * dan me-revoke seluruh sesi user (gejala: selalu 401 setelah desktop sleep).
 */
let refreshPromise: Promise<string> | null = null;

/**
 * Cross-tab refresh lock.
 *
 * `refreshPromise` (single-flight) hanya berlaku PER-TAB. Bila Kasirku dibuka di
 * beberapa tab, masing-masing punya refreshPromise sendiri → dua tab bisa
 * me-refresh refresh-token YANG SAMA. Bila jeda antar keduanya > 30 detik (grace
 * window backend), backend menganggapnya reuse berbahaya dan MENCABUT seluruh
 * sesi → "tiba-tiba 401 di semua tab", terutama setelah sleep panjang.
 *
 * Lock berbasis localStorage memastikan hanya SATU tab yang benar-benar memanggil
 * /auth/refresh; tab lain menunggu lalu membaca token baru dari storage.
 */
const LOCK_KEY = 'kasirku-refresh-lock';
const LOCK_TTL_MS = 12_000; // > timeout request refresh; lock basi dianggap hangus
const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function readLock(): { id: string; at: number } | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
  } catch {
    return null;
  }
}

/** Coba ambil lock. True bila tab ini yang memegang lock (boleh refresh). */
function acquireLock(): boolean {
  const existing = readLock();
  const now = Date.now();
  if (existing && now - existing.at < LOCK_TTL_MS && existing.id !== TAB_ID) {
    return false; // tab lain memegang lock yang masih segar
  }
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ id: TAB_ID, at: now }));
    // Last-writer-wins: baca ulang untuk memastikan kita yang menang race.
    return readLock()?.id === TAB_ID;
  } catch {
    return true; // storage bermasalah — jangan blokir refresh
  }
}

function releaseLock(): void {
  try {
    if (readLock()?.id === TAB_ID) localStorage.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tab kalah lock: tunggu sampai tab pemenang menulis access token baru ke storage.
 * Mengembalikan access token baru, atau null bila timeout (pemanggil boleh retry).
 */
async function waitForRotatedToken(previousAccess: string | null): Promise<string | null> {
  const deadline = Date.now() + LOCK_TTL_MS;
  while (Date.now() < deadline) {
    await sleep(150);
    const { accessToken } = getStoredAuth();
    // Token berubah (dirotasi tab lain) DAN masih valid → pakai itu.
    if (accessToken && accessToken !== previousAccess && !isTokenExpiredOrSoon(accessToken, 0)) {
      return accessToken;
    }
    // Lock sudah dilepas tapi token belum berubah → pemenang gagal; berhenti menunggu.
    if (!readLock()) break;
  }
  return null;
}

function getStoredAuth(): { accessToken: string | null; refreshToken: string | null; raw: string | null } {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null, raw: null };
  try {
    const raw = localStorage.getItem('kasirku-auth');
    const state = raw ? JSON.parse(raw) : null;
    return {
      raw,
      accessToken: state?.state?.accessToken ?? null,
      refreshToken: state?.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null, raw: null };
  }
}

function isTokenExpiredOrSoon(token: string, bufferSeconds = 60): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt - bufferSeconds * 1000;
  } catch {
    return true;
  }
}

function persistTokens(accessToken: string, refreshToken: string) {
  // SATU sumber kebenaran: tulis langsung ke localStorage key 'kasirku-auth'
  // dengan baca-ulang-merge agar field lain (user, outlets) tidak tersentuh.
  //
  // PENTING: jangan juga memanggil useAuthStore.setTokens() di sini. Persist
  // middleware Zustand akan men-serialize ulang SELURUH state in-memory pada set
  // berikutnya; bila instance store yang ke-`require` belum ter-hydrate (umum
  // saat refresh dipicu sebelum hydration / ada >1 instance modul di Next.js),
  // serialize itu menimpa token yang baru ditulis dengan null — inilah penyebab
  // "token hilang dari localStorage padahal user & outlets masih ada".
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('kasirku-auth');
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state = parsed.state ?? {};
    parsed.state.accessToken = accessToken;
    parsed.state.refreshToken = refreshToken;
    localStorage.setItem('kasirku-auth', JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kasirku-auth');
    localStorage.removeItem('kasirku-cart');
    localStorage.removeItem(LOCK_KEY);
    // Hindari loop redirect jika sudah di halaman login
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
}

/**
 * True bila ada refresh token yang secara struktur masih hidup (belum lewat 7
 * hari). Dipakai sebagai gerbang: hanya hapus sesi & lempar ke login bila benar
 * tidak ada refresh token yang bisa dipakai — bukan sekadar karena 1 request gagal.
 */
/** Refresh token terkini dari storage (sumber kebenaran). */
export function getRefreshToken(): string | null {
  return getStoredAuth().refreshToken;
}

export function hasUsableRefreshToken(): boolean {
  const { refreshToken } = getStoredAuth();
  if (!refreshToken) return false;
  // Refresh token belum kedaluwarsa (exp di payload). Bila tak ada exp, anggap usable.
  try {
    const payload = JSON.parse(atob(refreshToken.split('.')[1]));
    if (typeof payload.exp === 'number') return Date.now() < payload.exp * 1000;
  } catch {
    /* token bukan JWT standar — biarkan backend yang memutuskan */
  }
  return true;
}

/**
 * Lakukan refresh sekali saja (single-flight). Pemanggil paralel akan menerima
 * promise yang sama. Mengembalikan access token baru.
 */
function refreshOnce(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { accessToken, refreshToken } = getStoredAuth();
      if (!refreshToken) {
        throw new Error('no_refresh_token');
      }

      // Cross-tab: bila tab lain sedang me-refresh, JANGAN ikut memanggil
      // /auth/refresh (memicu reuse-detection). Tunggu hasilnya dari storage.
      if (!acquireLock()) {
        const rotated = await waitForRotatedToken(accessToken);
        if (rotated) return rotated;
        // Pemenang gagal/timeout. Bila token kita masih hidup, pakai. Selain itu
        // ambil lock dan refresh sendiri sebagai fallback.
        const fresh = getStoredAuth().accessToken;
        if (fresh && !isTokenExpiredOrSoon(fresh, 0)) return fresh;
        if (!acquireLock()) throw new Error('refresh_in_progress');
      }

      try {
        const { refreshToken: latest } = getStoredAuth();
        if (!latest) throw new Error('no_refresh_token');

        // PENTING: pakai axios MENTAH (bukan instance `api`), jadi response TIDAK
        // lewat interceptor yang meng-unwrap envelope. Backend membungkus semua
        // respons sukses sebagai { success, data, timestamp } — token ada di
        // `body.data`, BUKAN di top-level. Membaca body.accessToken langsung =
        // undefined → persistTokens(undefined) → token expired dipertahankan →
        // retry tetap 401 → "ke login setelah sleep". Unwrap eksplisit di sini.
        type RefreshTokens = { accessToken: string; refreshToken: string };
        const { data: body } = await axios.post<
          RefreshTokens | { success: boolean; data: RefreshTokens }
        >(`${BASE_URL}/auth/refresh`, { refreshToken: latest });

        const tokens: RefreshTokens =
          body && typeof body === 'object' && 'data' in body
            ? (body as { data: RefreshTokens }).data
            : (body as RefreshTokens);

        if (!tokens?.accessToken || !tokens?.refreshToken) {
          // Bentuk respons tak terduga — jangan tulis token kosong yang menimpa
          // sesi valid. Anggap gagal agar pemanggil bisa retry/biarkan.
          throw new Error('refresh_malformed_response');
        }

        persistTokens(tokens.accessToken, tokens.refreshToken);
        return tokens.accessToken;
      } finally {
        releaseLock();
      }
    } finally {
      // Reset lock DI DALAM rantai promise yang sama, agar tidak membuat rantai
      // .finally() terpisah yang reject-nya floating → unhandledRejection.
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Dipanggil sebelum memuat halaman / saat tab kembali aktif. Mengecek apakah
 * access token sudah/hampir expired, lalu refresh bila perlu. Aman dipanggil
 * berkali-kali secara paralel — semua share refreshOnce().
 */
export async function proactiveRefresh(): Promise<void> {
  const { accessToken, refreshToken } = getStoredAuth();
  if (!refreshToken) return;
  if (accessToken && !isTokenExpiredOrSoon(accessToken)) return;

  try {
    await refreshOnce();
  } catch (err) {
    // HANYA lempar ke login bila backend benar-benar menolak refresh token
    // (401/403) — artinya token sudah invalid/di-revoke. Error jaringan (server
    // mati, offline saat baru bangun dari sleep) JANGAN menghapus sesi: biarkan
    // request berikutnya mencoba lagi. Ini mencegah "balik ke login" padahal
    // refresh token masih valid 7 hari.
    const status = (err as AxiosError)?.response?.status;
    if (status === 401 || status === 403) {
      redirectToLogin();
    }
    // selain itu: diam — pemanggil (usePageFocus / load) akan retry.
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kasirku-auth');
      const state = raw ? JSON.parse(raw) : null;
      const token: string | null = state?.state?.accessToken ?? null;
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // storage inaccessible — skip silently
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === true && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Bukan 401, request tak punya config, atau sudah pernah di-retry → menyerah.
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Endpoint auth (login/refresh/logout) TIDAK boleh memicu refresh:
    // 401 di sini berarti kredensial salah / refresh token invalid — teruskan
    // error aslinya agar pesan backend ("Email atau password salah") tampil,
    // jangan tertimpa "no_refresh_token" atau ikut me-redirect/menghapus storage.
    if (original.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const newToken = await refreshOnce();
      if (original.headers) original.headers['Authorization'] = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      // Hanya hapus sesi bila refresh ditolak backend (token invalid). Error
      // jaringan dibiarkan agar tidak menendang user yang sesinya masih sah.
      const status = (refreshError as AxiosError)?.response?.status;
      const noToken = (refreshError as Error)?.message === 'no_refresh_token';
      if (status === 401 || status === 403 || noToken) {
        redirectToLogin();
      }
      return Promise.reject(refreshError);
    }
  },
);
