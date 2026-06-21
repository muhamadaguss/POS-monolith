import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { decodeJwt } from 'jose';

/**
 * Auth.js v5 — session layer untuk Kasirku.
 *
 * Backend NestJS tetap menjadi AUTHORITY token (bcrypt, RBAC, rotasi + reuse-detection,
 * audit). Auth.js dipakai sebagai pengelola SESI di Next.js: `Credentials` provider
 * mendelegasikan login ke `POST /auth/login` backend, lalu membungkus token backend
 * (access + refresh) ke dalam JWT session terenkripsi (cookie HttpOnly `authjs.session-token`).
 *
 * Refresh ditangani di callback `jwt` (panggil `POST /auth/refresh` saat access token
 * backend hampir kedaluwarsa). Ini MENGGANTIKAN single-flight/cross-tab/rotasi manual
 * di `lib/api.ts` — Auth.js men-serialize refresh per request server.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  currentOutletId: string | null;
  permissions: string[];
  /** true → user wajib ganti password sebelum memakai aplikasi (force-change). */
  mustChangePassword?: boolean;
  /** true → role yang wajib verifikasi PIN setelah login (kasir). */
  requiresPinVerification?: boolean;
  /** true → user sudah punya PIN (false → arahkan ke /setup-pin). */
  hasPin?: boolean;
  /** Status tenant (TRIAL, ACTIVE, SUSPENDED) */
  tenantStatus?: string;
  /** Tanggal berakhir trial (ISO string) */
  trialEndsAt?: string;
}

export interface OutletOption {
  id: string;
  name: string;
  role: string;
  permissions: string[];
}

interface BackendLoginData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  outlets: OutletOption[];
}

interface BackendRefreshData {
  accessToken: string;
  refreshToken: string;
}

/** Unwrap envelope backend `{ success, data, timestamp }` → `data`. */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** Epoch-ms kedaluwarsa dari JWT access token backend (klaim `exp`, detik → ms). */
function accessTokenExpiresAt(accessToken: string): number {
  try {
    const { exp } = decodeJwt(accessToken);
    return typeof exp === 'number' ? exp * 1000 : Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Panggil `/auth/refresh` backend; kembalikan token baru + waktu kedaluwarsa.
 *
 * WAJIB pakai timeout: callback `jwt` dipanggil oleh `GET /api/auth/session`,
 * yang ditunggu `useSession` di klien. Tanpa timeout, koneksi backend yang
 * basi/lambat setelah idle membuat fetch ini menggantung → /api/auth/session
 * menggantung → useSession terjebak status 'loading' → layout client (gate
 * `!ready`) menampilkan spinner selamanya ("stuck loading, baru muncul saat
 * refresh manual"). Dengan timeout, kegagalan jadi cepat → token.error =
 * RefreshTokenError → SessionErrorGuard menendang ke /login.
 */
async function refreshBackendTokens(refreshToken: string): Promise<BackendRefreshData> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error('refresh_failed');
  return unwrap<BackendRefreshData>(await res.json());
}

// Buffer refresh: rotasi 60 detik sebelum access token (15m) benar-benar kedaluwarsa.
const REFRESH_BUFFER_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      // Field dummy — login asli divalidasi backend. `authorize` menerima objek bebas.
      credentials: {
        email: {},
        password: {},
        tenantSlug: {},
        outletId: {},
      },
      authorize: async (credentials) => {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
            // tenantSlug opsional (Super Admin tak mengirim); outletId opsional.
            ...(credentials?.tenantSlug ? { tenantSlug: credentials.tenantSlug } : {}),
            ...(credentials?.outletId ? { outletId: credentials.outletId } : {}),
          }),
        });

        if (!res.ok) {
          // Lempar pesan backend agar tampil di form (mis. "Email atau password salah").
          let message = 'Login gagal. Periksa kembali kredensial Anda.';
          try {
            const body = await res.json();
            message = body?.message ?? body?.error ?? message;
          } catch {
            /* abaikan parse error */
          }
          throw new CredentialsLoginError(message);
        }

        const data = unwrap<BackendLoginData>(await res.json());
        // Object yang dikembalikan masuk ke callback `jwt` sebagai `user`.
        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          // field kustom dibawa lewat `user` → di-copy ke token di callback jwt
          appUser: data.user,
          outlets: data.outlets,
          backendAccessToken: data.accessToken,
          backendRefreshToken: data.refreshToken,
        } as unknown as import('next-auth').User;
      },
    }),
  ],
  callbacks: {
    // Gating optimistic dipanggil dari proxy.ts (lihat src/proxy.ts).
    authorized: ({ auth }) => !!auth?.user,

    async jwt({ token, user, trigger, session }) {
      // 1) Login pertama: salin data dari `authorize` ke token.
      if (user) {
        const u = user as unknown as {
          appUser: AuthUser;
          outlets: OutletOption[];
          backendAccessToken: string;
          backendRefreshToken: string;
        };
        token.appUser = u.appUser;
        token.outlets = u.outlets;
        token.backendAccessToken = u.backendAccessToken;
        token.backendRefreshToken = u.backendRefreshToken;
        token.accessTokenExpires = accessTokenExpiresAt(u.backendAccessToken);
        // Stempel waktu login (epoch ms) untuk timer "Sesi Aktif" lintas halaman.
        token.loginAt = Date.now();
        // Gate PIN: kasir wajib verifikasi PIN sekali per sesi. Mulai belum
        // terverifikasi; selain kasir dianggap langsung terverifikasi.
        token.pinVerified = !u.appUser.requiresPinVerification;
        return token;
      }

      // 2) Update sesi via `useSession().update()` — dipakai saat select-outlet
      //    menukar token (currentOutletId/role/permissions berubah).
      if (trigger === 'update' && session) {
        const s = session as Partial<{
          backendAccessToken: string;
          backendRefreshToken: string;
          outletUpdate: Pick<AuthUser, 'currentOutletId' | 'role' | 'permissions'>;
          mustChangePassword: boolean;
          pinVerified: boolean;
          hasPin: boolean;
        }>;
        if (s.backendAccessToken) {
          token.backendAccessToken = s.backendAccessToken;
          token.accessTokenExpires = accessTokenExpiresAt(s.backendAccessToken);
        }
        if (s.backendRefreshToken) token.backendRefreshToken = s.backendRefreshToken;
        // Merge parsial ke appUser yang sudah ada (jangan timpa field lain).
        if (s.outletUpdate && token.appUser) {
          token.appUser = { ...token.appUser, ...s.outletUpdate };
        }
        // Clear flag force-change setelah user berhasil ganti password.
        if (typeof s.mustChangePassword === 'boolean' && token.appUser) {
          token.appUser = { ...token.appUser, mustChangePassword: s.mustChangePassword };
        }
        // Tandai PIN terverifikasi (gate login) — disimpan di token, tidak persist ke DB.
        if (typeof s.pinVerified === 'boolean') {
          token.pinVerified = s.pinVerified;
        }
        // Tandai PIN sudah dibuat setelah /setup-pin berhasil.
        if (typeof s.hasPin === 'boolean' && token.appUser) {
          token.appUser = { ...token.appUser, hasPin: s.hasPin };
        }
        return token;
      }

      // 3) Token backend masih segar → pakai apa adanya.
      const expires = (token.accessTokenExpires as number | undefined) ?? 0;
      if (Date.now() < expires - REFRESH_BUFFER_MS) {
        return token;
      }

      // 4) Hampir/sudah kedaluwarsa → rotasi via backend.
      try {
        const refreshed = await refreshBackendTokens(token.backendRefreshToken as string);
        token.backendAccessToken = refreshed.accessToken;
        token.backendRefreshToken = refreshed.refreshToken;
        token.accessTokenExpires = accessTokenExpiresAt(refreshed.accessToken);
        delete token.error;
      } catch {
        // Refresh ditolak backend (token invalid/di-revoke) → tandai error agar
        // session callback bisa memaksa logout/redirect.
        token.error = 'RefreshTokenError';
      }
      return token;
    },

    async session({ session, token }) {
      const appUser = token.appUser as AuthUser | undefined;
      if (appUser) {
        session.user = {
          ...session.user,
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          role: appUser.role,
          tenantId: appUser.tenantId,
          currentOutletId: appUser.currentOutletId,
          permissions: appUser.permissions,
          mustChangePassword: appUser.mustChangePassword ?? false,
          requiresPinVerification: appUser.requiresPinVerification ?? false,
          hasPin: appUser.hasPin ?? false,
          tenantStatus: appUser.tenantStatus,
          trialEndsAt: appUser.trialEndsAt,
        };
      }
      session.outlets = (token.outlets as OutletOption[]) ?? [];
      session.error = token.error as string | undefined;
      session.loginAt = token.loginAt as number | undefined;
      session.pinVerified = (token.pinVerified as boolean | undefined) ?? true;
      // CATATAN KEAMANAN: backendRefreshToken TIDAK diekspos ke session (klien).
      // backendAccessToken diekspos hanya agar Client Component (POS) bisa
      // memanggil API; idealnya nanti dipindah ke route-handler proxy.
      session.backendAccessToken = token.backendAccessToken as string | undefined;
      return session;
    },
  },
});

/** Error login dgn pesan dari backend — pesannya muncul di `signIn` result. */
export class CredentialsLoginError extends Error {
  code = 'credentials';
  constructor(message: string) {
    super(message);
  }
}

// ── Augmentasi tipe modul next-auth ────────────────────────────────────────
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId: string | null;
      currentOutletId: string | null;
      permissions: string[];
      // Diisi pada PR2 (enforcement force-change); opsional di PR1.
      mustChangePassword?: boolean;
      /** true → kasir yang wajib verifikasi PIN setelah login. */
      requiresPinVerification?: boolean;
      /** true → user sudah punya PIN (false → /setup-pin). */
      hasPin?: boolean;
      /** Status tenant (TRIAL, ACTIVE, SUSPENDED) */
      tenantStatus?: string;
      /** Tanggal berakhir trial (ISO string) */
      trialEndsAt?: string;
    } & DefaultSession['user'];
    outlets: OutletOption[];
    backendAccessToken?: string;
    error?: string;
    /** Epoch ms saat login — acuan timer "Sesi Aktif" lintas halaman. */
    loginAt?: number;
    /** Gate PIN: true bila PIN sudah diverifikasi pada sesi ini (atau tak diperlukan). */
    pinVerified?: boolean;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    appUser?: AuthUser;
    outlets?: OutletOption[];
    backendAccessToken?: string;
    backendRefreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    /** Epoch ms saat login — acuan timer "Sesi Aktif". */
    loginAt?: number;
    /** Gate PIN: true bila PIN sudah diverifikasi pada sesi ini (atau tak diperlukan). */
    pinVerified?: boolean;
  }
}
