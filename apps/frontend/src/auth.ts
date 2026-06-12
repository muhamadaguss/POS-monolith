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

/** Panggil `/auth/refresh` backend; kembalikan token baru + waktu kedaluwarsa. */
async function refreshBackendTokens(refreshToken: string): Promise<BackendRefreshData> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
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
        return token;
      }

      // 2) Update sesi via `useSession().update()` — dipakai saat select-outlet
      //    menukar token (currentOutletId/role/permissions berubah).
      if (trigger === 'update' && session) {
        const s = session as Partial<{
          backendAccessToken: string;
          backendRefreshToken: string;
          outletUpdate: Pick<AuthUser, 'currentOutletId' | 'role' | 'permissions'>;
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
        };
      }
      session.outlets = (token.outlets as OutletOption[]) ?? [];
      session.error = token.error as string | undefined;
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
    } & DefaultSession['user'];
    outlets: OutletOption[];
    backendAccessToken?: string;
    error?: string;
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
  }
}
