import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios MENTAH (dipakai refreshOnce untuk /auth/refresh tanpa lewat interceptor).
// `api` instance dibuat dari axios.create — kita biarkan asli, hanya intip post mentah.
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
    },
  };
});

const AUTH_KEY = 'kasirku-auth';

/** Buat JWT palsu dengan klaim exp (detik epoch). Hanya bagian payload yang dibaca. */
function makeJwt(expSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
  return `${header}.${payload}.sig`;
}

function setAuth(accessToken: string | null, refreshToken: string | null) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ state: { accessToken, refreshToken, user: { id: 'u1' }, outlets: [{ id: 'o1' }] }, version: 0 }),
  );
}

function readAuthState() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw).state : null;
}

describe('lib/api', () => {
  let api: typeof import('./api');
  const mockedPost = axios.post as unknown as ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mockedPost.mockReset();
    // import ulang tiap test agar state modul (refreshPromise) bersih.
    api = await import('./api');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasUsableRefreshToken', () => {
    it('false bila tidak ada refresh token', () => {
      setAuth(makeJwt(900), null);
      expect(api.hasUsableRefreshToken()).toBe(false);
    });

    it('true bila refresh token belum kedaluwarsa', () => {
      setAuth(null, makeJwt(7 * 24 * 3600));
      expect(api.hasUsableRefreshToken()).toBe(true);
    });

    it('false bila refresh token sudah kedaluwarsa', () => {
      setAuth(null, makeJwt(-10));
      expect(api.hasUsableRefreshToken()).toBe(false);
    });
  });

  describe('getRefreshToken', () => {
    it('mengembalikan refresh token dari storage', () => {
      const rt = makeJwt(3600);
      setAuth(makeJwt(900), rt);
      expect(api.getRefreshToken()).toBe(rt);
    });

    it('null bila storage kosong', () => {
      expect(api.getRefreshToken()).toBeNull();
    });
  });

  describe('proactiveRefresh', () => {
    it('tidak memanggil /auth/refresh bila access token masih segar', async () => {
      setAuth(makeJwt(900), makeJwt(7 * 24 * 3600)); // access hidup 15m
      await api.proactiveRefresh();
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('tidak melakukan apa-apa bila tidak ada refresh token', async () => {
      setAuth(makeJwt(-10), null);
      await api.proactiveRefresh();
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('me-refresh bila access token hampir kedaluwarsa & menyimpan token baru (unwrap envelope)', async () => {
      setAuth(makeJwt(10), makeJwt(7 * 24 * 3600)); // access expired-soon (buffer 60s)
      const newAccess = makeJwt(900);
      const newRefresh = makeJwt(7 * 24 * 3600);
      // Backend membungkus { success, data } — refreshOnce harus meng-unwrap.
      mockedPost.mockResolvedValue({
        data: { success: true, data: { accessToken: newAccess, refreshToken: newRefresh } },
      });

      await api.proactiveRefresh();

      expect(mockedPost).toHaveBeenCalledTimes(1);
      expect(mockedPost).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.objectContaining({ refreshToken: expect.any(String) }),
      );
      // Token baru tersimpan, field lain (user/outlets) tetap utuh.
      const state = readAuthState();
      expect(state.accessToken).toBe(newAccess);
      expect(state.refreshToken).toBe(newRefresh);
      expect(state.user).toEqual({ id: 'u1' });
      expect(state.outlets).toEqual([{ id: 'o1' }]);
    });

    it('single-flight: dua pemanggil paralel hanya memicu SATU request refresh', async () => {
      setAuth(makeJwt(10), makeJwt(7 * 24 * 3600));
      mockedPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { success: true, data: { accessToken: makeJwt(900), refreshToken: makeJwt(7 * 24 * 3600) } },
                }),
              20,
            ),
          ),
      );

      await Promise.all([api.proactiveRefresh(), api.proactiveRefresh()]);

      expect(mockedPost).toHaveBeenCalledTimes(1);
    });

    it('tidak menimpa token valid bila respons refresh malformed', async () => {
      const goodAccess = makeJwt(10);
      const goodRefresh = makeJwt(7 * 24 * 3600);
      setAuth(goodAccess, goodRefresh);
      mockedPost.mockResolvedValue({ data: { success: true, data: { foo: 'bar' } } }); // tanpa token

      await api.proactiveRefresh();

      // Token lama dipertahankan, bukan ditimpa undefined.
      const state = readAuthState();
      expect(state.accessToken).toBe(goodAccess);
      expect(state.refreshToken).toBe(goodRefresh);
    });

    it('backend MENOLAK refresh (401) → sesi dihapus & redirect ke /login', async () => {
      setAuth(makeJwt(10), makeJwt(7 * 24 * 3600));
      // Backend bilang refresh token invalid/di-revoke.
      mockedPost.mockRejectedValue({ response: { status: 401 } });

      // jsdom tak benar-benar bernavigasi saat set location.href ("Not
      // implemented"); intip lewat stub agar bisa assert tujuan redirect.
      const hrefSetter = vi.fn();
      const original = window.location;
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { pathname: '/dashboard', set href(v: string) { hrefSetter(v); } },
      });

      await api.proactiveRefresh();

      // Storage auth dibersihkan (kredensial sudah tak sah).
      expect(localStorage.getItem(AUTH_KEY)).toBeNull();
      // Diarahkan ke login.
      expect(hrefSetter).toHaveBeenCalledWith('/login');

      Object.defineProperty(window, 'location', { configurable: true, value: original });
    });

    it('error JARINGAN (server mati / offline) → JANGAN hapus sesi, JANGAN redirect', async () => {
      const goodAccess = makeJwt(10);
      const goodRefresh = makeJwt(7 * 24 * 3600);
      setAuth(goodAccess, goodRefresh);
      // Tanpa `response` → ini error jaringan, bukan penolakan backend.
      mockedPost.mockRejectedValue(new Error('Network Error'));

      await api.proactiveRefresh();

      // Sesi TETAP utuh — request berikutnya akan retry. Ini mencegah
      // "balik ke login" padahal refresh token masih valid 7 hari.
      const state = readAuthState();
      expect(state.accessToken).toBe(goodAccess);
      expect(state.refreshToken).toBe(goodRefresh);
    });
  });
});
